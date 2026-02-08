import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository, USER_REPOSITORY } from '../user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-me',
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    if (typeof payload.iat !== 'number') {
      throw new UnauthorizedException('Invalid token: missing iat');
    }
    const issuedAt = payload.iat;
    const changedAtMs = user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0;
    if (changedAtMs && issuedAt * 1000 < changedAtMs) {
      throw new UnauthorizedException('Token expired');
    }
    return { userId: user.id, email: user.email };
  }
}
