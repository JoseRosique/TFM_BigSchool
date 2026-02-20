import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Group } from '../../domain/entities/group.entity';
import { User } from '../../domain/entities/user.entity';
import { Friendship, FriendshipStatus } from '../../domain/entities/friendship.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

export interface GroupMemberResponse {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  ownerId: string;
  members: GroupMemberResponse[];
  memberCount: number;
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
  ) {}

  async listGroups(userId: string, search?: string): Promise<GroupResponse[]> {
    const qb = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'member')
      .where('group.ownerId = :userId', { userId })
      .distinct(true);

    if (search?.trim()) {
      qb.andWhere('LOWER(group.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }

    qb.orderBy('group.updatedAt', 'DESC');

    const groups = await qb.getMany();
    return groups.map((group) => this.mapGroup(group));
  }

  async searchGroups(userId: string, term?: string): Promise<GroupResponse[]> {
    return this.listGroups(userId, term);
  }

  async createGroup(userId: string, dto: CreateGroupDto): Promise<GroupResponse> {
    const owner = await this.userRepository.findOne({ where: { id: userId } });
    if (!owner) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const memberIds = new Set(dto.memberIds ?? []);
    memberIds.add(userId);

    const members = await this.userRepository.findBy({ id: In(Array.from(memberIds)) });
    if (members.length !== memberIds.size) {
      throw new BadRequestException('INVALID_MEMBER');
    }

    const group = this.groupRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      icon: dto.icon.trim(),
      color: dto.color.trim(),
      ownerId: userId,
      owner,
      members,
    });

    const saved = await this.groupRepository.save(group);
    const fullGroup = await this.groupRepository.findOne({
      where: { id: saved.id },
      relations: ['members'],
    });

    if (!fullGroup) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    return this.mapGroup(fullGroup);
  }

  async updateGroup(userId: string, groupId: string, dto: UpdateGroupDto): Promise<GroupResponse> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (dto.name) {
      group.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      const normalizedDescription = dto.description.trim();
      group.description = normalizedDescription.length > 0 ? normalizedDescription : null;
    }

    if (dto.icon) {
      group.icon = dto.icon.trim();
    }

    if (dto.color) {
      group.color = dto.color.trim();
    }

    const membersById = new Map(group.members.map((member) => [member.id, member]));

    if (dto.addMemberIds?.length) {
      const toAdd = await this.userRepository.findBy({ id: In(dto.addMemberIds) });
      if (toAdd.length !== dto.addMemberIds.length) {
        const foundIds = new Set(toAdd.map((member) => member.id));
        const missingIds = dto.addMemberIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(`INVALID_MEMBER_IDS: ${missingIds.join(',')}`);
      }
      for (const member of toAdd) {
        membersById.set(member.id, member);
      }
    }

    if (dto.removeMemberIds?.length) {
      for (const memberId of dto.removeMemberIds) {
        if (memberId !== userId) {
          membersById.delete(memberId);
        }
      }
    }

    if (!membersById.has(userId)) {
      const owner = await this.userRepository.findOne({ where: { id: userId } });
      if (owner) {
        membersById.set(userId, owner);
      }
    }

    group.members = Array.from(membersById.values());

    const saved = await this.groupRepository.save(group);
    const fullGroup = await this.groupRepository.findOne({
      where: { id: saved.id },
      relations: ['members'],
    });

    if (!fullGroup) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    return this.mapGroup(fullGroup);
  }

  async deleteGroup(userId: string, groupId: string): Promise<void> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });

    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    await this.groupRepository.remove(group);
  }

  async getAvailableFriends(
    userId: string,
    groupId: string,
    search?: string,
  ): Promise<GroupMemberResponse[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { recipientId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    const friendIds = friendships.map((friendship) =>
      friendship.requesterId === userId ? friendship.recipientId : friendship.requesterId,
    );

    const excluded = new Set<string>([userId, ...group.members.map((member) => member.id)]);
    const availableIds = friendIds.filter((id) => !excluded.has(id));

    if (availableIds.length === 0) {
      return [];
    }

    const qb = this.userRepository.createQueryBuilder('user');
    qb.where('user.id IN (:...ids)', { ids: availableIds });

    if (search?.trim()) {
      const query = `%${search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(user.name) LIKE :query', { query })
            .orWhere('LOWER(user.email) LIKE :query', { query });
        }),
      );
    }

    const users = await qb.getMany();
    return users.map((user) => this.mapMember(user));
  }

  private mapGroup(group: Group): GroupResponse {
    const members = (group.members ?? []).map((member) => this.mapMember(member));

    return {
      id: group.id,
      name: group.name,
      description: group.description ?? undefined,
      icon: group.icon,
      color: group.color,
      ownerId: group.ownerId,
      members,
      memberCount: members.length,
    };
  }

  private mapMember(user: User): GroupMemberResponse {
    return {
      id: user.id,
      name: user.name,
      username: user.email,
      avatarUrl: user.avatarUrl ?? undefined,
    };
  }
}
