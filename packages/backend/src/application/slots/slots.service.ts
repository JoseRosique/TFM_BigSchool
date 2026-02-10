import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  ListSlotsDTO,
  OpenSlotDTO,
  ReservationStatus,
  SlotStatus,
  VisibilityScope,
} from '@meetwithfriends/shared';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { ListSlotsQueryDto } from './dto/list-slots.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepository: Repository<Slot>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async create(ownerId: string, dto: CreateSlotDto): Promise<OpenSlotDTO.Response> {
    const start = new Date(dto.start);
    const end = new Date(dto.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('INVALID_DATE');
    }

    if (end <= start) {
      throw new BadRequestException('INVALID_TIME_RANGE');
    }

    const slot = this.slotRepository.create({
      ownerId,
      start,
      end,
      timezone: dto.timezone,
      visibilityScope: dto.visibilityScope,
      notes: dto.notes?.trim() || undefined,
      status: SlotStatus.AVAILABLE,
    });

    const saved = await this.slotRepository.save(slot);

    return {
      id: saved.id,
      ownerId: saved.ownerId,
      start: saved.start,
      end: saved.end,
      timezone: saved.timezone,
      visibilityScope: saved.visibilityScope,
      status: saved.status,
    };
  }

  async findOne(slotId: string, requesterId: string): Promise<Slot> {
    const slot = await this.slotRepository.findOne({ where: { id: slotId } });

    if (!slot) {
      throw new NotFoundException('SLOT_NOT_FOUND');
    }

    if (slot.ownerId !== requesterId && slot.visibilityScope === VisibilityScope.PRIVATE) {
      throw new ForbiddenException('FORBIDDEN');
    }

    return slot;
  }

  async list(requesterId: string, query: ListSlotsQueryDto): Promise<ListSlotsDTO.Response> {
    const qb = this.slotRepository.createQueryBuilder('slot');

    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('INVALID_DATE');
      }
      qb.andWhere('slot.end >= :from', { from });
    }

    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('INVALID_DATE');
      }
      qb.andWhere('slot.start <= :to', { to });
    }

    if (query.status) {
      qb.andWhere('slot.status = :status', { status: query.status });
    }

    if (query.userId) {
      qb.andWhere('slot.ownerId = :ownerId', { ownerId: query.userId });
      if (query.userId !== requesterId) {
        qb.andWhere('slot.visibilityScope != :privateScope', {
          privateScope: VisibilityScope.PRIVATE,
        });
      }
    } else {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('slot.ownerId = :requesterId', { requesterId })
            .orWhere('slot.visibilityScope != :privateScope', {
              privateScope: VisibilityScope.PRIVATE,
            });
        }),
      );
    }

    qb.orderBy('slot.start', 'ASC');

    const [items, total] = await qb.getManyAndCount();

    return { items, total };
  }

  async update(slotId: string, ownerId: string, dto: UpdateSlotDto): Promise<Slot> {
    const slot = await this.slotRepository.findOne({ where: { id: slotId } });

    if (!slot) {
      throw new NotFoundException('SLOT_NOT_FOUND');
    }

    if (slot.ownerId !== ownerId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (dto.status === SlotStatus.RESERVED) {
      throw new BadRequestException('INVALID_STATUS');
    }

    if (slot.status === SlotStatus.RESERVED && dto.status !== SlotStatus.CANCELED) {
      throw new ConflictException('SLOT_ALREADY_RESERVED');
    }

    const nextStart = dto.start ? new Date(dto.start) : slot.start;
    const nextEnd = dto.end ? new Date(dto.end) : slot.end;

    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
      throw new BadRequestException('INVALID_DATE');
    }

    if (nextEnd <= nextStart) {
      throw new BadRequestException('INVALID_TIME_RANGE');
    }

    if (dto.status === SlotStatus.CANCELED && slot.status === SlotStatus.RESERVED) {
      const activeReservation = await this.reservationRepository.findOne({
        where: { slotId: slot.id, status: ReservationStatus.CREATED },
      });
      if (activeReservation) {
        activeReservation.status = ReservationStatus.CANCELED;
        activeReservation.canceledAt = new Date();
        await this.reservationRepository.save(activeReservation);
      }
    }

    slot.start = nextStart;
    slot.end = nextEnd;

    if (dto.timezone) {
      slot.timezone = dto.timezone;
    }

    if (dto.visibilityScope) {
      slot.visibilityScope = dto.visibilityScope;
    }

    if (dto.notes !== undefined) {
      slot.notes = dto.notes?.trim() || undefined;
    }

    if (dto.status) {
      slot.status = dto.status;
    }

    return this.slotRepository.save(slot);
  }

  async remove(slotId: string, ownerId: string): Promise<{ message: string }> {
    const slot = await this.slotRepository.findOne({ where: { id: slotId } });

    if (!slot) {
      throw new NotFoundException('SLOT_NOT_FOUND');
    }

    if (slot.ownerId !== ownerId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    await this.slotRepository.delete({ id: slotId });
    return { message: 'SLOT_DELETED' };
  }
}
