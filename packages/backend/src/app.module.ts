import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './infrastructure/config/env.config';
import { getDatabaseConfig } from './infrastructure/config/database.config';
import { AuthModule } from './application/auth/auth.module';
import { UsersModule } from './application/users/users.module';
import { FriendsModule } from './application/friends/friends.module';
import { SlotsModule } from './application/slots/slots.module';
import { ReservationsModule } from './application/reservations/reservations.module';
import { NotificationsModule } from './application/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
    UsersModule,
    FriendsModule,
    SlotsModule,
    ReservationsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
