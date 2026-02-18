import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../../domain/entities/user.entity';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';
import { Friendship } from '../../domain/entities/friendship.entity';
import { Group } from '../../domain/entities/group.entity';

export function getDatabaseConfig(): TypeOrmModuleOptions {
  // Check if DATABASE_URL is provided (Render PostgreSQL External URL)
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Parse DATABASE_URL format: postgresql://user:password@host:port/database
    const url = new URL(databaseUrl);

    return {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
      entities: [User, Slot, Reservation, Friendship, Group],
      migrations: ['dist/infrastructure/migrations/*.js'],
      migrationsTableName: 'typeorm_migrations',
      synchronize: false, // CRITICAL: Always false in production. Migrations are the source of truth.
      logging: process.env.LOG_LEVEL === 'debug',
      // SSL configuration for Render PostgreSQL
      ssl:
        process.env.DB_SSL === 'true'
          ? {
              rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
            }
          : false,
    };
  }

  // Fallback to individual DB environment variables
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
    // SSL configuration for Render PostgreSQL
    ssl:
      process.env.DB_SSL === 'true'
        ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
  };
}
