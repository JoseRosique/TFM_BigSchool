/**
 * Auth Module - NestJS structure
 * Responsabilidad: Register, Login, Logout, JWT validation
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../domain/entities/user.entity';
import { TypeOrmUserRepository } from '../../infrastructure/repositories/typeorm-user.repository';
import { RegisterUserUseCase } from './register-user.usecase';
import { LoginUserUseCase } from './login-user.usecase';
import { ChangePasswordUseCase } from './change-password.usecase';
import { TokenBlacklistService } from './token-blacklist.service';
import { PasswordResetService } from './password-reset.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { TestUtilsController } from './test-utils.controller';
import { TOKEN_STORE, InMemoryTokenStore } from './token-store';
import { GoogleLoginUseCase } from './google-login.usecase';
import { UserCreatedEmailSubscriber } from '../../infrastructure/subscribers/user-created-email.subscriber';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_EXPIRATION'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    RegisterUserUseCase,
    LoginUserUseCase,
    ChangePasswordUseCase,
    GoogleLoginUseCase,
    TokenBlacklistService,
    PasswordResetService,
    EmailService,
    UserCreatedEmailSubscriber,
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    TypeOrmUserRepository,
    {
      provide: TOKEN_STORE,
      useClass: InMemoryTokenStore,
    },
  ],
  controllers:
    process.env.NODE_ENV === 'test' ? [AuthController, TestUtilsController] : [AuthController],
  exports: [AuthService, TokenBlacklistService],
})
export class AuthModule {}
