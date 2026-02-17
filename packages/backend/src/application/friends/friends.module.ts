import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from '../../domain/entities/friendship.entity';
import { User } from '../../domain/entities/user.entity';
import { Group } from '../../domain/entities/group.entity';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

/**
 * Friends Module
 * Responsabilidad: Gestionar solicitudes, relaciones, listas
 */
@Module({
  imports: [TypeOrmModule.forFeature([Friendship, User, Group, Slot, Reservation])],
  providers: [FriendsService],
  controllers: [FriendsController],
})
export class FriendsModule {}
