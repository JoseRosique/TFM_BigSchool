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
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          // Permitimos estilos propios, inline y de Google Fonts
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          // Permitimos que las fuentes se descarguen de Google y de archivos locales
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          // Ajuste para connect-src (importante para evitar el error del shader/data:)
          connectSrc: ["'self'", corsOrigin, 'data:'],
          upgradeInsecureRequests: [], // Render ya usa HTTPS, esto evita conflictos
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
