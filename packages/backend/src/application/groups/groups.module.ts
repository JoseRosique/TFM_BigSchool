import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '../../domain/entities/group.entity';
import { User } from '../../domain/entities/user.entity';
import { Friendship } from '../../domain/entities/friendship.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

/**
 * Groups Module
 * Responsabilidad: Gestionar grupos sociales y miembros
 */
@Module({
  imports: [TypeOrmModule.forFeature([Group, User, Friendship])],
  providers: [GroupsService],
  controllers: [GroupsController],
  exports: [GroupsService],
})
export class GroupsModule {}
