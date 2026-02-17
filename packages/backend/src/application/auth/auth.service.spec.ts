import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { RegisterUserUseCase } from './register-user.usecase';
import { LoginUserUseCase } from './login-user.usecase';
import { JwtService } from '@nestjs/jwt';
import { RegisterDTO, LoginDTO } from '@meetwithfriends/shared';

describe('AuthService', () => {
  let service: AuthService;
  let registerUserUseCase: RegisterUserUseCase;
  let loginUserUseCase: LoginUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: RegisterUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: LoginUserUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    registerUserUseCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
    loginUserUseCase = module.get<LoginUserUseCase>(LoginUserUseCase);
  });

  it('should call register use case', async () => {
    const input: RegisterDTO.Request = {
      email: 'test@example.com',
      nickname: 'testuser',
      password: 'password123',
      name: 'Test',
      timezone: 'UTC',
    };
    const output: RegisterDTO.Response = {
      id: '1',
      email: input.email,
      nickname: input.nickname,
      name: input.name,
      timezone: input.timezone ?? 'UTC',
      language: 'es',
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
    };
    (registerUserUseCase.execute as jest.Mock).mockResolvedValue(output);
    const result = await service.register(input);
    expect(result).toEqual(output);
    expect(registerUserUseCase.execute).toHaveBeenCalledWith(input);
  });

  it('should call login use case', async () => {
    const input: LoginDTO.Request = {
      email: 'test@example.com',
      password: 'password123',
    };
    const output: LoginDTO.Response = {
      userId: '1',
      email: input.email,
      nickname: 'testuser',
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      language: 'es',
    };
    (loginUserUseCase.execute as jest.Mock).mockResolvedValue(output);
    const result = await service.login(input);
    expect(result).toEqual(output);
    expect(loginUserUseCase.execute).toHaveBeenCalledWith(input);
  });
});
