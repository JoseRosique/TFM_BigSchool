import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { ReserveSlotDto } from './dto/reserve-slot.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
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

      if (slot.ownerId === userId) {
        throw new BadRequestException('SLOT_OWNER_RESERVATION');
      }

      if (slot.visibilityScope === VisibilityScope.PRIVATE) {
        throw new ForbiddenException('FORBIDDEN');
      }

      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new ConflictException('SLOT_ALREADY_RESERVED');
      }

      const activeReservation = await reservationRepo.findOne({
        where: { slotId: slot.id, status: ReservationStatus.CREATED },
      });

      if (activeReservation) {
        throw new ConflictException('SLOT_ALREADY_RESERVED');
      }

      const reservation = reservationRepo.create({
        slotId: slot.id,
        userId,
        status: ReservationStatus.CREATED,
      });

      const saved = await reservationRepo.save(reservation);
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
      relations: ['slot'],
    });

    if (!reservation) {
      throw new NotFoundException('RESERVATION_NOT_FOUND');
    }

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

    return {
      items: items.map((reservation) => ({
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
      })),
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
