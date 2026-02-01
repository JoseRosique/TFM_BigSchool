import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { User } from '../../domain/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDTO } from '@meetwithfriends/shared';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: RegisterDTO.Request): Promise<RegisterDTO.Response> {
    // 1. Validar input (aquí se asume validación previa, pero podrías usar Zod)
    // 2. Verificar que el usuario no existe
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    // 3. Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);
    // 4. Crear usuario
    const user = new User();
    user.email = input.email;
    user.passwordHash = passwordHash;
    user.name = input.name;
    user.timezone = input.timezone || 'UTC';
    user.language = input.language || 'en';
    const saved = await this.userRepository.save(user);
    // 5. Retornar DTO seguro
    return {
      id: saved.id,
      email: saved.email,
      name: saved.name,
      timezone: saved.timezone,
      language: saved.language,
    };
  }
}
