import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import {
  ListReservationsDTO,
  Reservation as ReservationModel,
  ReservationStatus,
  ReserveSlotDTO,
  SlotStatus,
  VisibilityScope,
} from '@meetwithfriends/shared';
import { Reservation } from '../../domain/entities/reservation.entity';
import { Slot } from '../../domain/entities/slot.entity';
import { User } from '../../domain/entities/user.entity';
import { ReserveSlotDto } from './dto/reserve-slot.dto';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  private splitName(name?: string): { firstName: string; lastName: string } {
    const cleaned = (name ?? '').trim();
    if (!cleaned) {
      return { firstName: '', lastName: '' };
    }

    const [firstName, ...rest] = cleaned.split(/\s+/);
    return {
      firstName,
      lastName: rest.join(' '),
    };
  }

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async reserve(userId: string, dto: ReserveSlotDto): Promise<ReserveSlotDTO.Response> {
    this.logger.log(`User ${userId} attempting to reserve slot ${dto.slotId}`);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const slotRepo = manager.getRepository(Slot);
        const reservationRepo = manager.getRepository(Reservation);

        this.logger.debug(`Fetching slot ${dto.slotId} with pessimistic lock`);
        const slot = await slotRepo.findOne({
          where: { id: dto.slotId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!slot) {
          this.logger.warn(`Slot not found: ${dto.slotId}`);
          throw new NotFoundException('SLOT_NOT_FOUND');
        }

        // Validación 1: Impedir que el usuario reserve su propia franja
        if (slot.ownerId === userId) {
          this.logger.warn(`User ${userId} tried to reserve own slot ${dto.slotId}`);
          throw new ForbiddenException('CANNOT_RESERVE_OWN_SLOT');
        }

        // Validación 2: Verificar acceso a la franja
        if (slot.visibilityScope === VisibilityScope.PRIVATE) {
          this.logger.warn(`User ${userId} tried to access private slot ${dto.slotId}`);
          throw new ForbiddenException('FORBIDDEN');
        }

        // Validación 3: Verificar que la franja esté disponible
        if (slot.status !== SlotStatus.AVAILABLE) {
          this.logger.warn(`Slot ${dto.slotId} is not available (status: ${slot.status})`);
          throw new ConflictException('SLOT_ALREADY_RESERVED');
        }

        // Validación 4: Verificar que no haya una reservación activa duplicada
        const activeReservation = await reservationRepo.findOne({
          where: { slotId: slot.id, status: ReservationStatus.CREATED },
        });

        if (activeReservation) {
          this.logger.warn(
            `Slot ${dto.slotId} already has active reservation ${activeReservation.id}`,
          );
          throw new ConflictException('SLOT_ALREADY_RESERVED');
        }

        // Crear reservación
        this.logger.debug(`Creating reservation for user ${userId} on slot ${dto.slotId}`);
        const reservation = reservationRepo.create({
          slotId: slot.id,
          userId,
          status: ReservationStatus.CREATED,
        });

        const saved = await reservationRepo.save(reservation);

        // Marcar franja como reservada de forma bidireccional
        this.logger.debug(`Marking slot ${dto.slotId} as RESERVED`);
        slot.status = SlotStatus.RESERVED;
        await slotRepo.save(slot);

        this.logger.log(`Successfully created reservation ${saved.id} for slot ${dto.slotId}`);

        return {
          id: saved.id,
          slotId: saved.slotId,
          userId: saved.userId,
          status: saved.status,
        };
      });
    } catch (error) {
      // Si es una excepción HTTP conocida, re-lanzarla
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Para cualquier otro error, loggear detalles y lanzar InternalServerErrorException
      this.logger.error(
        `Unexpected error reserving slot ${dto.slotId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the reservation',
      );
    }
  }

  async findOne(reservationId: string, requesterId: string): Promise<ReservationModel> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ['slot', 'slot.owner', 'user'],
    });

    if (!reservation) {
      throw new NotFoundException('RESERVATION_NOT_FOUND');
    }

    // Validación bidireccional: tanto el usuario que reserva como el creador pueden ver
    if (reservation.userId !== requesterId && reservation.slot.ownerId !== requesterId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    return {
      id: reservation.id,
      slotId: reservation.slotId,
      userId: reservation.userId,
      status: reservation.status,
      createdAt: reservation.createdAt,
      canceledAt: reservation.canceledAt,
    };
  }

  async listMine(
    userId: string,
    type: ListReservationsDTO.QueryType = 'mine',
  ): Promise<ListReservationsDTO.Response> {
    if (type === 'received') {
      const [items, total] = await this.reservationRepository.findAndCount({
        where: {
          status: ReservationStatus.CREATED,
          slot: {
            ownerId: userId,
            status: SlotStatus.RESERVED,
          },
        },
        relations: ['slot', 'slot.owner', 'user'],
        order: {
          slot: {
            start: 'ASC',
          },
        },
      });

      return {
        items: items.map((reservation) => {
          const user = reservation.user || null;
          const reservedByName = user
            ? this.splitName(user.name || '')
            : { firstName: '', lastName: '' };

          return {
            id: reservation.id,
            slotId: reservation.slotId,
            userId: reservation.userId,
            status: reservation.status,
            createdAt: reservation.createdAt,
            canceledAt: reservation.canceledAt,
            slotStart: reservation.slot.start,
            slotEnd: reservation.slot.end,
            slotTimezone: reservation.slot.timezone,
            slotOwnerId: reservation.slot.ownerId,
            slotOwnerName: reservation.slot.owner?.name || 'Unknown',
            slotOwnerNickname: reservation.slot.owner?.nickname || 'Unknown',
            reserverName: user?.name || 'Unknown',
            reserverNickname: user?.nickname || 'Unknown',
            slotNotes: reservation.slot.notes,
            reservedBy: {
              id: user?.id || null,
              name: user?.name || 'Unknown',
              nickname: user?.nickname || 'Unknown',
              firstName: reservedByName.firstName,
              lastName: reservedByName.lastName,
              avatarUrl: user?.avatarUrl || null,
            },
          };
        }),
        total,
      };
    }

    const [items, total] = await this.reservationRepository.findAndCount({
      where: { userId },
      relations: ['slot'],
      order: { createdAt: 'DESC' },
    });

    // Get unique user IDs (slot owners and reservers)
    const userIds = new Set<string>();
    items.forEach((reservation) => {
      userIds.add(reservation.userId);
      userIds.add(reservation.slot.ownerId);
    });

    // Fetch all users in one query
    const users = await this.userRepository.find({
      where: { id: In(Array.from(userIds)) },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      items: items.map((reservation) => {
        const reserver = userMap.get(reservation.userId);
        const slotOwner = userMap.get(reservation.slot.ownerId);
        return {
          id: reservation.id,
          slotId: reservation.slotId,
          userId: reservation.userId,
          status: reservation.status,
          createdAt: reservation.createdAt,
          canceledAt: reservation.canceledAt,
          slotStart: reservation.slot.start,
          slotEnd: reservation.slot.end,
          slotTimezone: reservation.slot.timezone,
          slotOwnerId: reservation.slot.ownerId,
          slotOwnerName: slotOwner?.name || 'Unknown',
          slotOwnerNickname: slotOwner?.nickname || 'Unknown',
          reserverName: reserver?.name || 'Unknown',
          reserverNickname: reserver?.nickname || 'Unknown',
          slotNotes: reservation.slot.notes,
        };
      }),
      total,
    };
  }

  async cancel(reservationId: string, requesterId: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to cancel reservation: ${reservationId} by user: ${requesterId}`);

    try {
      await this.dataSource.transaction(async (manager) => {
        const reservationRepo = manager.getRepository(Reservation);
        const slotRepo = manager.getRepository(Slot);

        // Paso 1: Cargar la reserva con lock (sin relaciones para evitar LEFT JOIN + FOR UPDATE)
        this.logger.debug(`Fetching reservation ${reservationId} with pessimistic lock`);
        const reservation = await reservationRepo.findOne({
          where: { id: reservationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!reservation) {
          this.logger.warn(`Reservation not found: ${reservationId}`);
          throw new NotFoundException('RESERVATION_NOT_FOUND');
        }

        // Paso 2: Cargar el slot asociado con lock
        this.logger.debug(`Fetching slot ${reservation.slotId} with pessimistic lock`);
        const slot = await slotRepo.findOne({
          where: { id: reservation.slotId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!slot) {
          this.logger.error(
            `Slot ${reservation.slotId} not found for reservation ${reservationId}`,
          );
          throw new NotFoundException('SLOT_NOT_FOUND');
        }

        this.logger.debug(
          `Validating permissions - userId: ${reservation.userId}, slotOwnerId: ${slot.ownerId}, requesterId: ${requesterId}`,
        );

        // Validación bidireccional: el usuario que reserva O el dueño del slot pueden cancelar
        if (reservation.userId !== requesterId && slot.ownerId !== requesterId) {
          this.logger.warn(
            `Permission denied for user ${requesterId} to cancel reservation ${reservationId}`,
          );
          throw new ForbiddenException('FORBIDDEN');
        }

        // Si ya está cancelada, retornar éxito (idempotencia)
        if (reservation.status === ReservationStatus.CANCELED) {
          this.logger.log(`Reservation ${reservationId} already canceled - returning success`);
          return;
        }

        this.logger.debug(`Updating reservation ${reservationId} status to CANCELED`);
        reservation.status = ReservationStatus.CANCELED;
        reservation.canceledAt = new Date();
        await reservationRepo.save(reservation);

        // Si el slot estaba reservado, liberarlo
        if (slot.status === SlotStatus.RESERVED) {
          this.logger.debug(`Releasing slot ${slot.id} to AVAILABLE status`);
          slot.status = SlotStatus.AVAILABLE;
          await slotRepo.save(slot);
        }

        this.logger.log(`Successfully canceled reservation ${reservationId}`);
      });

      return { message: 'RESERVATION_CANCELED' };
    } catch (error) {
      // Si es una excepción HTTP conocida, re-lanzarla
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Para cualquier otro error, loggear detalles y lanzar InternalServerErrorException
      this.logger.error(
        `Unexpected error canceling reservation ${reservationId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred while canceling the reservation',
      );
    }
  }
}
