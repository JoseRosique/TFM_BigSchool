import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, In } from 'typeorm';
import {
  ListSlotsDTO,
  OpenSlotDTO,
  ReservationStatus,
  SlotStatus,
  VisibilityScope,
} from '@meetwithfriends/shared';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';
import { Group } from '../../domain/entities/group.entity';
import { User } from '../../domain/entities/user.entity';
import { Friendship, FriendshipStatus } from '../../domain/entities/friendship.entity';
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
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
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

    // Validar que todos los groupIds pertenecen al dueño
    let groups: Group[] = [];
    if (dto.groupIds && dto.groupIds.length > 0) {
      groups = await this.groupRepository.find({
        where: { id: In(dto.groupIds), ownerId },
      });
      // Validar que se encontraron todos los grupos
      if (groups.length !== dto.groupIds.length) {
        const foundIds = new Set(groups.map((g) => g.id));
        const missingIds = dto.groupIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(`GROUP_NOT_FOUND_OR_NOT_OWNED: ${missingIds.join(', ')}`);
      }
    }

    const slot = this.slotRepository.create({
      ownerId,
      start,
      end,
      timezone: dto.timezone,
      visibilityScope: dto.visibilityScope,
      notes: dto.notes?.trim() || undefined,
      status: SlotStatus.AVAILABLE,
      groups,
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

    // Manejar actualización de grupos
    if (dto.groupIds !== undefined) {
      let groups: Group[] = [];
      if (dto.groupIds.length > 0) {
        groups = await this.groupRepository.find({
          where: { id: In(dto.groupIds), ownerId },
        });
        // Validar que se encontraron todos los grupos
        if (groups.length !== dto.groupIds.length) {
          const foundIds = new Set(groups.map((g) => g.id));
          const missingIds = dto.groupIds.filter((id) => !foundIds.has(id));
          throw new BadRequestException(`GROUP_NOT_FOUND_OR_NOT_OWNED: ${missingIds.join(', ')}`);
        }
      }
      slot.groups = groups;
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

  async getMyAvailability(
    userId: string,
    query: ListSlotsQueryDto,
  ): Promise<ListSlotsDTO.Response> {
    const qb = this.slotRepository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.owner', 'owner')
      .where('slot.ownerId = :userId', { userId });

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

    qb.orderBy('slot.start', 'ASC');
    const [items, total] = await qb.getManyAndCount();

    return { items, total };
  }

  async getExploreSlots(userId: string, query: ListSlotsQueryDto): Promise<ListSlotsDTO.Response> {
    // Obtener amigos del usuario actual
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { recipientId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.recipientId : f.requesterId,
    );

    if (friendIds.length === 0) {
      return { items: [], total: 0 };
    }

    // Query principal con JOIN a groups
    const qb = this.slotRepository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.owner', 'owner')
      .leftJoinAndSelect('slot.groups', 'groups')
      .where('slot.ownerId IN (:...friendIds)', { friendIds })
      .andWhere('slot.ownerId != :userId', { userId })
      .andWhere('slot.visibilityScope != :private', { private: VisibilityScope.PRIVATE });

    // Condición compleja: el usuario debe estar en uno de los grupos de la franja
    // O la franja debe ser AVAILABLE, O el usuario actual es quien la reservó
    qb.andWhere(
      new Brackets((subQb) => {
        subQb
          .where(
            // El usuario pertenece a uno de los grupos de la franja
            'EXISTS (SELECT 1 FROM slot_groups sg ' +
              'INNER JOIN group_members gm ON sg.group_id = gm.group_id ' +
              'WHERE sg.slot_id = slot.id AND gm.user_id = :userId)',
            { userId },
          )
          .orWhere('slot.status = :available', { available: SlotStatus.AVAILABLE })
          .orWhere(
            // El usuario actual tiene una reserva activa en esta franja
            'EXISTS (SELECT 1 FROM reservations r ' +
              'WHERE r.slot_id = slot.id AND r.user_id = :userId AND r.status = :created)',
            { userId, created: ReservationStatus.CREATED },
          );
      }),
    );

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

    qb.orderBy('slot.start', 'ASC').distinct(true);

    const [items, total] = await qb.getManyAndCount();

    return { items, total };
  }
  async getSlotDetail(slotId: string, requesterId: string): Promise<any> {
    const slot = await this.slotRepository.findOne({
      where: { id: slotId },
      relations: ['owner'],
    });

    if (!slot) {
      throw new NotFoundException('SLOT_NOT_FOUND');
    }

    // Validar acceso a la franja
    if (slot.ownerId !== requesterId && slot.visibilityScope === VisibilityScope.PRIVATE) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (!slot.owner) {
      throw new InternalServerErrorException('SLOT_OWNER_NOT_FOUND');
    }

    // Obtener la reservación activa si existe
    const activeReservation = await this.reservationRepository.findOne({
      where: { slotId: slot.id, status: ReservationStatus.CREATED },
      relations: ['user'],
    });

    // Obtener datos del reservante si existe (solo para el creador)
    let reservedByUser = null;
    if (activeReservation && slot.ownerId === requesterId) {
      reservedByUser = {
        id: activeReservation.user.id,
        name: activeReservation.user.name,
        nickname: activeReservation.user.nickname,
        avatarUrl: activeReservation.user.avatarUrl,
      };
    }

    return {
      id: slot.id,
      start: slot.start,
      end: slot.end,
      timezone: slot.timezone,
      status: slot.status,
      visibilityScope: slot.visibilityScope,
      notes: slot.notes,
      creator: {
        id: slot.owner.id,
        name: slot.owner.name,
        nickname: slot.owner.nickname,
        avatarUrl: slot.owner.avatarUrl,
      },
      isReserved: slot.status === SlotStatus.RESERVED,
      reservedBy: reservedByUser,
    };
  }
}
