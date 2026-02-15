import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Friendship, FriendshipStatus } from '../../domain/entities/friendship.entity';

export interface FriendGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface FriendResponse {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  group?: FriendGroup | null;
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
  ) {}

  async getFriends(userId: string): Promise<FriendResponse[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { recipientId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'recipient', 'requester.groups', 'recipient.groups'],
    });

    return friendships.map((friendship) => {
      const other = friendship.requesterId === userId ? friendship.recipient : friendship.requester;
      return this.mapUserToFriend(other, {
        isPending: false,
        isBlocked: false,
        isFriend: true,
      });
    });
  }

  async getPendingRequests(userId: string): Promise<FriendResponse[]> {
    const pending = await this.friendshipRepository.find({
      where: { recipientId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'],
    });

    return pending.map((friendship) =>
      this.mapUserToFriend(friendship.requester, {
        isPending: true,
        isBlocked: false,
        isFriend: false,
        requestId: friendship.id,
      }),
    );
  }

  async getBlockedUsers(userId: string): Promise<FriendResponse[]> {
    const blocked = await this.friendshipRepository.find({
      where: { requesterId: userId, status: FriendshipStatus.BLOCKED },
      relations: ['recipient'],
    });

    return blocked.map((friendship) =>
      this.mapUserToFriend(friendship.recipient, {
        isPending: false,
        isBlocked: true,
        isFriend: false,
      }),
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

    // Buscar TODOS los usuarios que coincidan con el nombre (excepto el usuario actual)
    const qb = this.userRepository.createQueryBuilder('user');
    qb.where('user.id != :userId', { userId });
    qb.andWhere(
      "(LOWER(user.name) LIKE :query ESCAPE '\\' OR LOWER(user.email) LIKE :query ESCAPE '\\')",
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
    return users.map((user) => {
      const relation = relationMap.get(user.id);
      if (!relation) {
        // Sin relación: usuario desconocido
        return this.mapUserToFriend(user, {
          isPending: false,
          isBlocked: false,
          isFriend: false,
        });
      }

      // Con relación: incluir el estado actual
      switch (relation.status) {
        case FriendshipStatus.ACCEPTED:
          return this.mapUserToFriend(user, {
            isPending: false,
            isBlocked: false,
            isFriend: true,
          });
        case FriendshipStatus.PENDING:
          return this.mapUserToFriend(user, {
            isPending: true,
            isBlocked: false,
            isFriend: false,
            sentByMe: relation.requesterId === userId,
            requestId: relation.id,
          });
        case FriendshipStatus.BLOCKED:
          return this.mapUserToFriend(user, {
            isPending: false,
            isBlocked: true,
            isFriend: false,
          });
        default:
          return this.mapUserToFriend(user, {
            isPending: false,
            isBlocked: false,
            isFriend: false,
          });
      }
    });
  }

  async createRequest(requesterId: string, recipientId: string): Promise<void> {
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

    await this.friendshipRepository.save(friendship);
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
    const byId = await this.friendshipRepository.findOne({ where: { id: idOrUserId } });
    if (byId) {
      if (byId.requesterId !== userId && byId.recipientId !== userId) {
        throw new BadRequestException('FORBIDDEN');
      }
      await this.friendshipRepository.remove(byId);
      return;
    }

    const relationship = await this.findRelationshipBetween(userId, idOrUserId);
    if (!relationship) {
      throw new NotFoundException('FRIENDSHIP_NOT_FOUND');
    }

    await this.friendshipRepository.remove(relationship);
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

  private mapUserToFriend(
    user: User,
    options: {
      isPending: boolean;
      isBlocked: boolean;
      isFriend?: boolean;
      sentByMe?: boolean;
      requestId?: string;
    },
  ): FriendResponse {
    let relationshipStatus: 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'BLOCKED' | null =
      null;

    if (options.isBlocked) {
      relationshipStatus = 'BLOCKED';
    } else if (options.isFriend) {
      relationshipStatus = 'ACCEPTED';
    } else if (options.isPending) {
      relationshipStatus = options.sentByMe ? 'PENDING_SENT' : 'PENDING_RECEIVED';
    }

    return {
      id: user.id,
      name: user.name,
      username: user.email,
      avatarUrl: user.avatarUrl ?? undefined,
      group: user.groups?.[0]
        ? {
            id: user.groups[0].id,
            name: user.groups[0].name,
            icon: user.groups[0].icon,
            color: user.groups[0].color,
          }
        : null,
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
