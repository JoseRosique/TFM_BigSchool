import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDTO, LoginDTO } from '@meetwithfriends/shared';
import { RegisterUserUseCase } from './register-user.usecase';
import { LoginUserUseCase } from './login-user.usecase';

/**
 * Auth Service - Application layer
 * Orquesta casos de uso: Register, Login
 * Depende de puertos (UserRepository)
 */
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private registerUserUseCase: RegisterUserUseCase,
    private loginUserUseCase: LoginUserUseCase,
  ) {}

  async register(input: RegisterDTO.Request): Promise<RegisterDTO.Response> {
    // Llama al caso de uso de registro
    return this.registerUserUseCase.execute(input);
  }

  async login(input: LoginDTO.Request): Promise<LoginDTO.Response> {
    // Llama al caso de uso de login seguro
    return this.loginUserUseCase.execute(input);
  }

  async validateUser(email: string, password: string): Promise<any> {
    // TODO: Estrategia Local - validar credenciales
    throw new Error('Not implemented');
  }
}
