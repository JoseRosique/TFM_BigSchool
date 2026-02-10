import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../../domain/entities/user.entity';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';

export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'meetwithfriends',
    entities: [User, Slot, Reservation],
    migrations: ['dist/infrastructure/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.LOG_LEVEL === 'debug',
  };
}
