import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { User } from '../../domain/entities/user.entity';
import { LoginDTO } from '@meetwithfriends/shared';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Google Login Use Case
 * Verifica el token de Google, crea usuario si no existe, y devuelve JWT
 */
@Injectable()
export class GoogleLoginUseCase {
  private googleClient: OAuth2Client;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      console.warn('⚠️  GOOGLE_CLIENT_ID not configured. Google Sign-In will not work.');
    }
    this.googleClient = new OAuth2Client(clientId);
  }

  /**
   * Ejecuta el flujo de Google Sign-In:
   * 1. Verifica el token JWT de Google
   * 2. Extrae información del usuario (email, nombre, foto)
   * 3. Si el usuario existe → Login
   * 4. Si no existe → Registro automático
   * 5. Devuelve JWT de la aplicación
   */
  async execute(credential: string): Promise<LoginDTO.Response> {
    // 1. Verificar token de Google
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();

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
    } catch (error) {
      // Re-throw known framework exceptions
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Google token verification error:', error);
      throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
    }

    const email = payload.email!;
    const name = payload.name || payload.given_name || email.split('@')[0];
    const avatarUrl = payload.picture || undefined;

    // 2. Buscar usuario por email
    let user = await this.userRepository.findByEmail(email);

    // 3. Si no existe, crear automáticamente (registro rápido)
    if (!user) {
      user = await this.createUserFromGoogle(email, name, avatarUrl);
    }

    // 4. Generar JWT de la aplicación
    return this.generateTokens(user);
  }

  /**
   * Crea un usuario automáticamente desde los datos de Google
   */
  private async createUserFromGoogle(
    email: string,
    name: string,
    avatarUrl?: string,
  ): Promise<User> {
    // Generar nickname único basado en el email
    const baseNickname = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    let nickname = baseNickname;
    let counter = 1;

    // Asegurar que el nickname sea único
    while (await this.userRepository.findByNickname(nickname)) {
      nickname = `${baseNickname}${counter}`;
      counter++;
    }

    // Generar password hash aleatorio (el usuario no lo necesitará para login con Google)
    const randomPassword = randomBytes(24).toString('hex') + Date.now().toString(36);
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const newUser: User = {
      id: '',
      email,
      passwordHash,
      name,
      nickname,
      timezone: 'UTC',
      language: 'es',
      theme: 'dark',
      emailNotifications: true,
      pushNotifications: true,
      twoFactorEnabled: false,
      avatarUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownedGroups: [],
      groups: [],
    };

    const savedUser = await this.userRepository.save(newUser);
    console.log(`✅ New user created via Google Sign-In: ${savedUser.email} (${savedUser.id})`);

    return savedUser;
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
