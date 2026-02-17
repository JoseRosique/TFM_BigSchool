import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserRepository, USER_REPOSITORY } from '../user.repository';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    // Extraer token del header
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Validar si el token está en el blacklist
    if (token && this.tokenBlacklist.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    if (typeof payload.iat !== 'number') {
      throw new UnauthorizedException('Invalid token: missing iat');
    }
    const issuedAt = payload.iat;
    const changedAtSec = user.passwordChangedAt
      ? Math.floor(user.passwordChangedAt.getTime() / 1000)
      : 0;
    if (changedAtSec && changedAtSec > issuedAt) {
      throw new UnauthorizedException('Token expired');
    }
    return { userId: user.id, email: user.email, nickname: user.nickname };
  }
}
