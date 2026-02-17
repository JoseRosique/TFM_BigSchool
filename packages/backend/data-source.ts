import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './src/infrastructure/config/database.config';

export const AppDataSource = new DataSource({
  ...(getDatabaseConfig() as any),
  // Detecta automáticamente cualquier archivo que termine en .entity.ts
  entities: [__dirname + '/src/domain/entities/**/*.entity{.ts,.js}'],
  // Detecta automáticamente cualquier migración nueva en la carpeta
  migrations: [__dirname + '/src/infrastructure/migrations/**/*{.ts,.js}'],
  // Evita que TypeORM intente sincronizar la DB por su cuenta
  synchronize: false,
  logging: true,
});
