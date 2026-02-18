import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './src/infrastructure/config/database.config';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';

dotenv.config({ path: path.join(__dirname, envFile) });

const dbConfig = getDatabaseConfig() as any;

export const AppDataSource = new DataSource({
  ...dbConfig,
  // Forzamos la URL del env si está disponible (la external de Render)
  url: process.env.DATABASE_URL,

  // CONFIGURACIÓN DE SSL PARA RENDER
  ssl: process.env.NODE_ENV === 'production' ? true : false,
  extra:
    process.env.NODE_ENV === 'production'
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {},

  entities: [__dirname + '/src/domain/entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/src/infrastructure/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
