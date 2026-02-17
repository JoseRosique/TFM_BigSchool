import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { User } from '../../domain/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { LoginDTO } from '@meetwithfriends/shared';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: LoginDTO.Request): Promise<LoginDTO.Response> {
    // 1. Buscar usuario por email
    const user: User | null = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // 2. Comparar password
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // 3. Generar JWTs seguros
    const accessPayload = { sub: user.id, email: user.email, nickname: user.nickname };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    });
    const refreshPayload = {
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      type: 'refresh',
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRATION'),
    });
    // 4. Retornar DTO según contrato compartido
    return {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      accessToken,
      refreshToken,
      language: user.language,
    };
  }
}
