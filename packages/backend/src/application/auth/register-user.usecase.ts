import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { User } from '../../domain/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDTO } from '@meetwithfriends/shared';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: RegisterDTO.Request): Promise<RegisterDTO.Response> {
    // 1. Validar input
    // 2. Verificar que el usuario no existe
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }
    // 3. Verificar que el nickname no existe
    const existingNickname = await this.userRepository.findByNickname(input.nickname);
    if (existingNickname) {
      throw new ConflictException('NICKNAME_ALREADY_EXISTS');
    }
    // 4. Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);
    // 5. Crear usuario
    const user = new User();
    user.email = input.email;
    user.nickname = input.nickname;
    user.passwordHash = passwordHash;
    user.name = input.name;
    user.timezone = input.timezone || 'UTC';
    user.language = input.language || 'en';
    user.theme = 'dark';
    user.passwordChangedAt = new Date();
    const saved = await this.userRepository.save(user);
    const accessPayload = { sub: saved.id, nickname: saved.nickname };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    });
    const refreshPayload = { sub: saved.id, nickname: saved.nickname, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRATION'),
    });

    // 6. Retornar DTO seguro
    return {
      id: saved.id,
      email: saved.email,
      name: saved.name,
      nickname: saved.nickname,
      timezone: saved.timezone,
      language: saved.language,
      accessToken,
      refreshToken,
    };
  }
}
