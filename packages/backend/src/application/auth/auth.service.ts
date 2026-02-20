import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDTO, LoginDTO, RefreshTokenDTO } from '@meetwithfriends/shared';
import { ConfigService } from '@nestjs/config';
import { RegisterUserUseCase } from './register-user.usecase';
import { LoginUserUseCase } from './login-user.usecase';
import { GoogleLoginUseCase } from './google-login.usecase';
import { TokenBlacklistService } from './token-blacklist.service';

/**
 * Auth Service - Application layer
 * Orquesta casos de uso: Register, Login
 * Depende de puertos (UserRepository)
 */
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private registerUserUseCase: RegisterUserUseCase,
    private loginUserUseCase: LoginUserUseCase,
    private googleLoginUseCase: GoogleLoginUseCase,
    private tokenBlacklist: TokenBlacklistService,
  ) {}

  async register(input: RegisterDTO.Request): Promise<RegisterDTO.Response> {
    // Llama al caso de uso de registro
    return this.registerUserUseCase.execute(input);
  }

  async login(input: LoginDTO.Request): Promise<LoginDTO.Response> {
    // Llama al caso de uso de login seguro
    return this.loginUserUseCase.execute(input);
  }
  googleLogin(credential: string): Promise<LoginDTO.Response> {
    // Llama al caso de uso de Google Sign-In
    return this.googleLoginUseCase.execute(credential);
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenDTO.Response> {
    if (!refreshToken) {
      throw new UnauthorizedException('REFRESH_TOKEN_MISSING');
    }

    if (this.tokenBlacklist.isBlacklisted(refreshToken)) {
      throw new UnauthorizedException('REFRESH_TOKEN_REVOKED');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID');
    }

    if (payload?.type !== 'refresh') {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID');
    }

    const accessPayload = { sub: payload.sub, email: payload.email };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    });

    return { accessToken };
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    const accessTtl = this.parseDurationToSeconds(
      this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    );
    const refreshTtl = this.parseDurationToSeconds(
      this.configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRATION'),
    );

    if (accessToken) {
      this.tokenBlacklist.blacklistToken(accessToken, accessTtl);
    }

    if (refreshToken) {
      this.tokenBlacklist.blacklistToken(refreshToken, refreshTtl);
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    // TODO: Estrategia Local - validar credenciales
    throw new Error('Not implemented');
  }

  private parseDurationToSeconds(value: string): number {
    const match = /^([0-9]+)([smhd])$/.exec(value.trim());
    if (!match) {
      throw new Error(
        `Invalid duration format for token TTL: "${value}" — expected formats like "15s","10m","1h","2d"`,
      );
    }
    const amount = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 60 * 60;
      case 'd':
        return amount * 60 * 60 * 24;
      default:
        throw new Error(
          `Invalid duration format for token TTL: "${value}" — expected formats like "15s","10m","1h","2d"`,
        );
    }
  }
}
