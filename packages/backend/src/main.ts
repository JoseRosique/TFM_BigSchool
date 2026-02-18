import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  app.setGlobalPrefix('api');
  const corsOrigin = configService.getOrThrow<string>('CORS_ORIGIN');

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // AÑADIDO: 'unsafe-inline' aquí es necesario para Angular
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          // Para los iconos y estilos de Google
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          // Para descargar las fuentes reales
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          // Para las llamadas a la API y extensiones
          connectSrc: ["'self'", corsOrigin, 'data:'],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Necesario para que algunos navegadores no bloqueen recursos externos
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = parseInt(process.env.PORT ?? '3000', 10);

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend listening on port ${port}`);
}
bootstrap();
