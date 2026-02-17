import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Friendship, FriendshipStatus } from '../../domain/entities/friendship.entity';
import { Group } from '../../domain/entities/group.entity';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';
import { ReservationStatus, SlotStatus } from '@meetwithfriends/shared';

export interface FriendGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface FriendResponse {
  id: string;
  name: string;
  nickname: string;
  username: string;
  avatarUrl?: string;
  groups: FriendGroup[];
  status: 'online' | 'offline';
  isBlocked: boolean;
  isPending: boolean;
  isFriend: boolean;
  relationshipStatus?: 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'BLOCKED' | null;
  sentByMe?: boolean;
  requestId?: string;
}

export interface FriendListResponse {
  id: string;
  name: string;
  count: number;
  icon: string;
  color: string;
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Slot)
    private readonly slotRepository: Repository<Slot>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly dataSource: DataSource,
  ) {}

  async getFriends(userId: string): Promise<FriendResponse[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { recipientId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'recipient'],
    });

    return Promise.all(
      friendships.map((friendship) => {
        const other =
          friendship.requesterId === userId ? friendship.recipient : friendship.requester;
        return this.mapUserToFriend(other, userId, {
          isPending: false,
          isBlocked: false,
          isFriend: true,
        });
      }),
    );
  }

  async getPendingRequests(userId: string): Promise<FriendResponse[]> {
    const pending = await this.friendshipRepository.find({
      where: { recipientId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'],
    });

    return Promise.all(
      pending.map((friendship) =>
        this.mapUserToFriend(friendship.requester, userId, {
          isPending: true,
          isBlocked: false,
          isFriend: false,
          requestId: friendship.id,
        }),
      ),
    );
  }

  async getBlockedUsers(userId: string): Promise<FriendResponse[]> {
    const blocked = await this.friendshipRepository.find({
      where: { requesterId: userId, status: FriendshipStatus.BLOCKED },
      relations: ['recipient'],
    });

    return Promise.all(
      blocked.map((friendship) =>
        this.mapUserToFriend(friendship.recipient, userId, {
          isPending: false,
          isBlocked: true,
          isFriend: false,
        }),
      ),
    );
  }

  async getFriendLists(userId: string): Promise<FriendListResponse[]> {
    return [];
  }

  async searchUsers(userId: string, query: string): Promise<FriendResponse[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const escaped = trimmed.replace(/([%_\\])/g, '\\$1');

    // Buscar TODOS los usuarios que coincidan con el nombre o nickname (excepto el usuario actual)
    const qb = this.userRepository.createQueryBuilder('user');
    qb.where('user.id != :userId', { userId });
    qb.andWhere(
      "(LOWER(user.name) LIKE :query ESCAPE '\\' OR LOWER(user.nickname) LIKE :query ESCAPE '\\')",
      { query: `%${escaped.toLowerCase()}%` },
    );

    const users = await qb.getMany();

    // Para cada usuario, verificar su relación conmigo
    const relationMap = new Map<string, Friendship>();
    const relations = await this.friendshipRepository.find({
      where: [{ requesterId: userId }, { recipientId: userId }],
    });

    for (const relation of relations) {
      const otherId = relation.requesterId === userId ? relation.recipientId : relation.requesterId;
      relationMap.set(otherId, relation);
    }

    // Mapear usuarios con sus estados de relación
    const results = users
      .filter((user) => {
        const relation = relationMap.get(user.id);
        return !relation || relation.status !== FriendshipStatus.BLOCKED;
      })
      .map(async (user) => {
        const relation = relationMap.get(user.id);
        if (!relation) {
          // Sin relación: usuario desconocido
          return this.mapUserToFriend(user, userId, {
            isPending: false,
            isBlocked: false,
            isFriend: false,
          });
        }

        // Con relación: incluir el estado actual
        switch (relation.status) {
          case FriendshipStatus.ACCEPTED:
            return this.mapUserToFriend(user, userId, {
              isPending: false,
              isBlocked: false,
              isFriend: true,
            });
          case FriendshipStatus.PENDING:
            return this.mapUserToFriend(user, userId, {
              isPending: true,
              isBlocked: false,
              isFriend: false,
              sentByMe: relation.requesterId === userId,
              requestId: relation.id,
            });
          default:
            return this.mapUserToFriend(user, userId, {
              isPending: false,
              isBlocked: false,
              isFriend: false,
            });
        }
      });

    return Promise.all(results);
  }

  async createRequest(requesterId: string, recipientId: string): Promise<Friendship> {
    if (requesterId === recipientId) {
      throw new BadRequestException('CANNOT_FRIEND_SELF');
    }

    const target = await this.userRepository.findOne({ where: { id: recipientId } });
    if (!target) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const existing = await this.findRelationshipBetween(requesterId, recipientId);
    if (existing) {
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('USER_BLOCKED');
      }
      throw new BadRequestException('FRIENDSHIP_ALREADY_EXISTS');
    }

    const friendship = this.friendshipRepository.create({
      requesterId,
      recipientId,
      status: FriendshipStatus.PENDING,
    });

    const saved = await this.friendshipRepository.save(friendship);
    return saved;
  }

  async acceptRequest(userId: string, requestId: string): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({ where: { id: requestId } });
    if (!friendship) {
      throw new NotFoundException('REQUEST_NOT_FOUND');
    }
    if (friendship.recipientId !== userId || friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('REQUEST_NOT_ACCEPTABLE');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    await this.friendshipRepository.save(friendship);
  }

  async deleteRelationship(userId: string, idOrUserId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const byId = await queryRunner.manager.findOne(Friendship, { where: { id: idOrUserId } });
      let friendId: string;

      if (byId) {
        if (byId.requesterId !== userId && byId.recipientId !== userId) {
          throw new BadRequestException('FORBIDDEN');
        }
        friendId = byId.requesterId === userId ? byId.recipientId : byId.requesterId;
        await queryRunner.manager.remove(Friendship, byId);
      } else {
        const relationship = await this.findRelationshipBetween(userId, idOrUserId);
        if (!relationship) {
          throw new NotFoundException('FRIENDSHIP_NOT_FOUND');
        }
        friendId = idOrUserId;
        await queryRunner.manager.remove(Friendship, relationship);
      }

      // 1. Eliminar al usuario de todos los grupos creados por el otro usuario
      const friendGroups = await queryRunner.manager.find(Group, { where: { ownerId: friendId } });
      if (friendGroups.length > 0) {
        const groupIds = friendGroups.map((g: Group) => g.id);
        await queryRunner.query(
          `DELETE FROM group_members WHERE group_id = ANY($1) AND user_id = $2`,
          [groupIds, userId],
        );
      }

      // 2. Cancelar reservas activas del usuario en franjas del amigo
      const userReservationsByFriend = await queryRunner.manager
        .createQueryBuilder(Reservation, 'reservation')
        .innerJoin('reservation.slot', 'slot')
        .where('reservation.userId = :userId', { userId })
        .andWhere('slot.ownerId = :ownerId', { ownerId: friendId })
        .andWhere('reservation.status = :status', { status: ReservationStatus.CREATED })
        .getMany();

      for (const reservation of userReservationsByFriend) {
        reservation.status = ReservationStatus.CANCELED;
        reservation.canceledAt = new Date();
        await queryRunner.manager.save(reservation);

        const slot = await queryRunner.manager.findOne(Slot, { where: { id: reservation.slotId } });
        if (slot) {
          slot.status = SlotStatus.AVAILABLE;
          await queryRunner.manager.save(slot);
        }
      }

      // 3. Cancelar reservas activas del amigo en franjas del usuario
      const friendReservationsByUser = await queryRunner.manager
        .createQueryBuilder(Reservation, 'reservation')
        .innerJoin('reservation.slot', 'slot')
        .where('reservation.userId = :userId', { userId: friendId })
        .andWhere('slot.ownerId = :ownerId', { ownerId: userId })
        .andWhere('reservation.status = :status', { status: ReservationStatus.CREATED })
        .getMany();

      for (const reservation of friendReservationsByUser) {
        reservation.status = ReservationStatus.CANCELED;
        reservation.canceledAt = new Date();
        await queryRunner.manager.save(reservation);

        const slot = await queryRunner.manager.findOne(Slot, { where: { id: reservation.slotId } });
        if (slot) {
          slot.status = SlotStatus.AVAILABLE;
          await queryRunner.manager.save(slot);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async blockUser(requesterId: string, recipientId: string): Promise<void> {
    if (requesterId === recipientId) {
      throw new BadRequestException('CANNOT_BLOCK_SELF');
    }

    const target = await this.userRepository.findOne({ where: { id: recipientId } });
    if (!target) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const existing = await this.findRelationshipBetween(requesterId, recipientId);
    if (existing) {
      if (existing.status === FriendshipStatus.BLOCKED) {
        if (existing.blockedBy && existing.blockedBy !== requesterId) {
          throw new BadRequestException('USER_BLOCKED');
        }
        return;
      }
      await this.friendshipRepository.remove(existing);
    }

    const friendship = this.friendshipRepository.create({
      requesterId,
      recipientId,
      status: FriendshipStatus.BLOCKED,
      blockedBy: requesterId,
    });

    await this.friendshipRepository.save(friendship);
  }

  async unblockUser(requesterId: string, recipientId: string): Promise<void> {
    const blocked = await this.findRelationshipBetween(requesterId, recipientId);

    if (!blocked || blocked.status !== FriendshipStatus.BLOCKED) {
      return;
    }

    if (blocked.blockedBy && blocked.blockedBy !== requesterId) {
      return;
    }

    await this.friendshipRepository.remove(blocked);
  }

  private async findRelationshipBetween(
    userId: string,
    otherUserId: string,
  ): Promise<Friendship | null> {
    return this.friendshipRepository.findOne({
      where: [
        { requesterId: userId, recipientId: otherUserId },
        { requesterId: otherUserId, recipientId: userId },
      ],
    });
  }

  private async mapUserToFriend(
    user: User,
    currentUserId: string,
    options: {
      isPending: boolean;
      isBlocked: boolean;
      isFriend?: boolean;
      sentByMe?: boolean;
      requestId?: string;
    },
  ): Promise<FriendResponse> {
    let relationshipStatus: 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'BLOCKED' | null =
      null;

    if (options.isBlocked) {
      relationshipStatus = 'BLOCKED';
    } else if (options.isFriend) {
      relationshipStatus = 'ACCEPTED';
    } else if (options.isPending) {
      relationshipStatus = options.sentByMe ? 'PENDING_SENT' : 'PENDING_RECEIVED';
    }

    // SEGURIDAD: Solo traer grupos que:
    // 1. Pertenecen al usuario autenticado (ownerId === currentUserId)
    // 2. Contienen al usuario actual (user.id está en los miembros del grupo)
    const privateGroups = await this.groupRepository.find({
      where: {
        ownerId: currentUserId,
      },
      relations: ['members'],
    });

    // Filtrar solo los grupos que contienen al amigo
    const groupsWithFriend = privateGroups.filter((group) =>
      group.members?.some((member) => member.id === user.id),
    );

    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      username: user.nickname,
      avatarUrl: user.avatarUrl,
      groups: groupsWithFriend.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        color: g.color,
      })),
      status: 'offline',
      isBlocked: options.isBlocked,
      isPending: options.isPending,
      isFriend: options.isFriend ?? false,
      relationshipStatus,
      sentByMe: options.sentByMe,
      requestId: options.requestId,
    };
  }
}
