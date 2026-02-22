import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { User } from '../../domain/entities/user.entity';
import { LoginDTO } from '@meetwithfriends/shared';

/**
 * Google Login Use Case
 * Verifica el token de Google, crea usuario si no existe (atomically), y devuelve JWT
 */
@Injectable()
export class GoogleLoginUseCase {
  private googleClient: OAuth2Client;
  private readonly allowedAudiences: string[];

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const additionalClientIds = this.configService
      .get<string>('GOOGLE_CLIENT_IDS', '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    this.allowedAudiences = Array.from(new Set([clientId, ...additionalClientIds]));
    this.googleClient = new OAuth2Client(clientId);

    console.log('[GoogleLoginUseCase] Allowed Google audiences:', this.allowedAudiences);
  }

  /**
   * Ejecuta el flujo de Google Sign-In:
   * 1. Verifica el token JWT de Google
   * 2. Extrae información del usuario (email, nombre, foto)
   * 3. Busca o crea usuario atomically (previene race conditions)
   * 4. Devuelve JWT de la aplicación
   */
  async execute(credential: string): Promise<LoginDTO.Response> {
    // 1. Verificar token de Google
    const payload = await this.verifyGoogleToken(credential);

    const email = payload.email!;
    const name = payload.name || payload.given_name || email.split('@')[0];

    // 2. Buscar o crear usuario (operación atómica)
    // NO usamos la URL de Google, el repositorio asignará un avatar predeterminado
    const { user } = await this.userRepository.findOrCreateGoogleUser(email, name);

    // 3. Generar JWT de la aplicación
    return this.generateTokens(user);
  }

  /**
   * Verifica el token de Google y extrae el payload
   * Maneja errores sin exponer stack traces
   */
  private async verifyGoogleToken(credential: string) {
    const decodedPayload = this.decodeJwtPayload(credential);

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.allowedAudiences,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
      }

      // Validar issuer (debe ser accounts.google.com)
      if (
        !payload.iss ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)
      ) {
        throw new UnauthorizedException('INVALID_TOKEN_ISSUER');
      }

      // Validar que el email esté verificado
      if (!payload.email_verified) {
        throw new BadRequestException('EMAIL_NOT_VERIFIED');
      }

      return payload;
    } catch (error) {
      // Re-throw known framework exceptions
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }

      // Log error details internally, but don't expose to client
      console.error(
        'Google token verification error:',
        error instanceof Error ? error.message : error,
      );
      console.error('[GoogleLoginUseCase] Verification context:', {
        tokenAud: decodedPayload?.aud,
        tokenIss: decodedPayload?.iss,
        allowedAudiences: this.allowedAudiences,
      });
      throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
    }
  }

  private decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }

      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = Buffer.from(payload, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  /**
   * Genera access token y refresh token
   */
  private generateTokens(user: User): LoginDTO.Response {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRATION'),
      },
    );

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
