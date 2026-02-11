import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ChangePasswordDTO } from '@meetwithfriends/shared';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    userId: string,
    input: ChangePasswordDTO.Request,
  ): Promise<ChangePasswordDTO.Response> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('PASSWORD_INVALID_CURRENT');
    }

    const sameAsCurrent = await bcrypt.compare(input.newPassword, user.passwordHash);
    if (sameAsCurrent) {
      throw new BadRequestException('PASSWORD_REUSE');
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    user.passwordChangedAt = new Date();
    const updated = await this.userRepository.save(user);

    const payload = {
      sub: updated.id,
      email: updated.email,
      passwordChangedAt: updated.passwordChangedAt
        ? updated.passwordChangedAt.toISOString()
        : undefined,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    });

    return { accessToken };
  }
}
