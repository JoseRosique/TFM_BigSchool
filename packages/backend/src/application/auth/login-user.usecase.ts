import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { User } from '../../domain/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { LoginDTO } from '@meetwithfriends/shared';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
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
    // 3. Generar JWT seguro
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);
    // 4. Retornar DTO según contrato compartido
    return {
      userId: user.id,
      email: user.email,
      accessToken: token,
      language: user.language,
    };
  }
}
