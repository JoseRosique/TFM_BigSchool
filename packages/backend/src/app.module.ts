import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './infrastructure/config/env.config';
import { getDatabaseConfig } from './infrastructure/config/database.config';
import { AuthModule } from './application/auth/auth.module';
import { UsersModule } from './application/users/users.module';
import { FriendsModule } from './application/friends/friends.module';
import { GroupsModule } from './application/groups/groups.module';
import { SlotsModule } from './application/slots/slots.module';
import { ReservationsModule } from './application/reservations/reservations.module';
import { NotificationsModule } from './application/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
          limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
    UsersModule,
    FriendsModule,
    GroupsModule,
    SlotsModule,
    ReservationsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
