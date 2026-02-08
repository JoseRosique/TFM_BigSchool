/**
 * Auth Module - NestJS structure
 * Responsabilidad: Register, Login, Logout, JWT validation
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

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
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { TestUtilsController } from './test-utils.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
      signOptions: { expiresIn: '24h' },
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
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    TypeOrmUserRepository,
  ],
  controllers:
    process.env.NODE_ENV === 'test' ? [AuthController, TestUtilsController] : [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
