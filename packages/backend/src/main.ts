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
          // Angular + Google Sign-In SDK
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://accounts.google.com',
            'https://www.gstatic.com',
            'https://apis.google.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
            'https://kit.fontawesome.com',
            'https://ka-f.fontawesome.com',
          ],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          // Google Fonts + Google Sign-In UI
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://accounts.google.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
            'https://kit.fontawesome.com',
            'https://ka-f.fontawesome.com',
          ],
          // Google Fonts
          fontSrc: [
            "'self'",
            'data:',
            'https://fonts.gstatic.com',
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
            'https://kit.fontawesome.com',
            'https://ka-f.fontawesome.com',
          ],
          // API calls + Google OAuth
          connectSrc: [
            "'self'",
            corsOrigin,
            'data:',
            'https://accounts.google.com',
            'https://www.gstatic.com',
            'https://apis.google.com',
            'https://www.googleapis.com',
            'https://kit.fontawesome.com',
            'https://ka-f.fontawesome.com',
          ],
          // Google Sign-In iframes
          frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.google.com'],
          formAction: ["'self'", 'https://accounts.google.com'],
          workerSrc: ["'self'", 'blob:'],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
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
