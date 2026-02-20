import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
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
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async reserve(userId: string, dto: ReserveSlotDto): Promise<ReserveSlotDTO.Response> {
    return this.dataSource.transaction(async (manager) => {
      const slotRepo = manager.getRepository(Slot);
      const reservationRepo = manager.getRepository(Reservation);

      const slot = await slotRepo.findOne({
        where: { id: dto.slotId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!slot) {
        throw new NotFoundException('SLOT_NOT_FOUND');
      }

      // Validación 1: Impedir que el usuario reserve su propia franja
      if (slot.ownerId === userId) {
        throw new ForbiddenException('CANNOT_RESERVE_OWN_SLOT');
      }

      // Validación 2: Verificar acceso a la franja
      if (slot.visibilityScope === VisibilityScope.PRIVATE) {
        throw new ForbiddenException('FORBIDDEN');
      }

      // Validación 3: Verificar que la franja esté disponible
      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new ConflictException('SLOT_ALREADY_RESERVED');
      }

      // Validación 4: Verificar que no haya una reservación activa duplicada
      const activeReservation = await reservationRepo.findOne({
        where: { slotId: slot.id, status: ReservationStatus.CREATED },
      });

      if (activeReservation) {
        throw new ConflictException('SLOT_ALREADY_RESERVED');
      }

      // Crear reservación
      const reservation = reservationRepo.create({
        slotId: slot.id,
        userId,
        status: ReservationStatus.CREATED,
      });

      const saved = await reservationRepo.save(reservation);

      // Marcar franja como reservada de forma bidireccional
      slot.status = SlotStatus.RESERVED;
      await slotRepo.save(slot);

      return {
        id: saved.id,
        slotId: saved.slotId,
        userId: saved.userId,
        status: saved.status,
      };
    });
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

  async listMine(userId: string): Promise<ListReservationsDTO.Response> {
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
        };
      }),
      total,
    };
  }

  async cancel(reservationId: string, requesterId: string): Promise<{ message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const reservationRepo = manager.getRepository(Reservation);
      const slotRepo = manager.getRepository(Slot);

      const reservation = await reservationRepo.findOne({
        where: { id: reservationId },
        relations: ['slot'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!reservation) {
        throw new NotFoundException('RESERVATION_NOT_FOUND');
      }

      if (reservation.userId !== requesterId && reservation.slot.ownerId !== requesterId) {
        throw new ForbiddenException('FORBIDDEN');
      }

      if (reservation.status === ReservationStatus.CANCELED) {
        return;
      }

      reservation.status = ReservationStatus.CANCELED;
      reservation.canceledAt = new Date();
      await reservationRepo.save(reservation);

      if (reservation.slot.status === SlotStatus.RESERVED) {
        reservation.slot.status = SlotStatus.AVAILABLE;
        await slotRepo.save(reservation.slot);
      }
    });

    return { message: 'RESERVATION_CANCELED' };
  }
}
