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
  // Lista estática de timezones IANA válidos
  private readonly validTimezones: Set<string> = new Set([
    'UTC',
    'Europe/Madrid',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Buenos_Aires',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Australia/Sydney',
    'Pacific/Auckland',
    // Agregar más según necesidad
  ]);

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

  /**
   * Valida que el timezone proporcionado sea un identificador IANA válido
   */
  private validateTimezone(timezone: string): void {
    if (!timezone || !this.validTimezones.has(timezone)) {
      throw new BadRequestException('INVALID_TIMEZONE');
    }
  }

  private async resolveOwnedGroups(ownerId: string, groupIds: string[] = []): Promise<Group[]> {
    if (groupIds.length === 0) {
      return [];
    }

    const groups = await this.groupRepository.find({
      where: { id: In(groupIds), ownerId },
    });

    if (groups.length !== groupIds.length) {
      const foundIds = new Set(groups.map((group) => group.id));
      const missingIds = groupIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`GROUP_NOT_FOUND_OR_NOT_OWNED: ${missingIds.join(', ')}`);
    }

    return groups;
  }

  async create(ownerId: string, dto: CreateSlotDto): Promise<OpenSlotDTO.Response> {
    const start = new Date(dto.start);
    const end = new Date(dto.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('INVALID_DATE');
    }

    if (end <= start) {
      throw new BadRequestException('INVALID_TIME_RANGE');
    }

    // Validar timezone
    this.validateTimezone(dto.timezone);

    const effectiveGroupIds =
      dto.visibilityScope === VisibilityScope.LIST ? (dto.groupIds ?? []) : [];
    const groups = await this.resolveOwnedGroups(ownerId, effectiveGroupIds);

    if (dto.visibilityScope === VisibilityScope.LIST && groups.length === 0) {
      throw new BadRequestException('GROUP_REQUIRED_FOR_LIST_VISIBILITY');
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
    const slot = await this.slotRepository.findOne({
      where: { id: slotId },
      relations: ['groups'],
    });

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

    // Validar timezone si se proporciona
    if (dto.timezone) {
      this.validateTimezone(dto.timezone);
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
      const groups = await this.resolveOwnedGroups(ownerId, dto.groupIds);
      slot.groups = groups;
    }

    const effectiveScope = slot.visibilityScope;

    if (effectiveScope === VisibilityScope.LIST && (!slot.groups || slot.groups.length === 0)) {
      throw new BadRequestException('GROUP_REQUIRED_FOR_LIST_VISIBILITY');
    }

    if (effectiveScope !== VisibilityScope.LIST) {
      slot.groups = [];
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
      .leftJoinAndSelect('slot.groups', 'groups')
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

    // Visibilidad efectiva:
    // - FRIENDS: visible a amigos
    // - LIST: visible solo si pertenece a alguno de los grupos del slot
    // - Siempre visible si el usuario tiene una reserva activa en ese slot
    qb.andWhere(
      new Brackets((subQb) => {
        subQb
          .where('slot.visibilityScope = :friendsScope', {
            friendsScope: VisibilityScope.FRIENDS,
          })
          .orWhere(
            new Brackets((groupScopedQb) => {
              groupScopedQb
                .where('slot.visibilityScope = :listScope', {
                  listScope: VisibilityScope.LIST,
                })
                .andWhere(
                  'EXISTS (SELECT 1 FROM slot_groups sg ' +
                    'INNER JOIN group_members gm ON sg.group_id = gm.group_id ' +
                    'WHERE sg.slot_id = slot.id AND gm.user_id = :userId)',
                  { userId },
                );
            }),
          )
          .orWhere(
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
