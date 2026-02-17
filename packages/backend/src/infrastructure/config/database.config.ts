import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../../domain/entities/user.entity';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';
import { Friendship } from '../../domain/entities/friendship.entity';
import { Group } from '../../domain/entities/group.entity';

export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'meetwithfriends',
    entities: [User, Slot, Reservation, Friendship, Group],
    migrations: ['dist/infrastructure/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false, // CRITICAL: Always false in production. Migrations are the source of truth.
    logging: process.env.LOG_LEVEL === 'debug',
  };
}
