import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UserRepository, USER_REPOSITORY } from './user.repository';
import { EmailService } from '../../infrastructure/services/email.service';
import { TokenStore, TOKEN_STORE } from './token-store';

@Injectable()
export class PasswordResetService {
  private readonly tokenTtlMs = 15 * 60 * 1000;
  // Rate limiting map: email -> { count, windowStart }
  private readonly resetAttempts = new Map<string, { count: number; windowStart: number }>();
  private readonly rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
  private readonly maxAttempts = 3;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    @Inject(TOKEN_STORE)
    private readonly tokenStore: TokenStore,
  ) {}

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    // Rate Limiting Check
    const now = Date.now();
    const attempt = this.resetAttempts.get(normalizedEmail);

    if (attempt) {
      if (now - attempt.windowStart > this.rateLimitWindowMs) {
        // Reset window
        this.resetAttempts.set(normalizedEmail, { count: 1, windowStart: now });
      } else {
        if (attempt.count >= this.maxAttempts) {
          // Rate limit exceeded - silently return
          return;
        }
        attempt.count++;
      }
    } else {
      this.resetAttempts.set(normalizedEmail, { count: 1, windowStart: now });
    }

    // Cleanup old attempts occasionally (simple approach)
    if (this.resetAttempts.size > 1000) {
      for (const [key, val] of this.resetAttempts.entries()) {
        if (now - val.windowStart > this.rateLimitWindowMs) {
          this.resetAttempts.delete(key);
        }
      }
    }

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = Date.now() + this.tokenTtlMs;

    await this.tokenStore.setToken(tokenHash, { userId: user.id, expiresAt }, this.tokenTtlMs);
    await this.emailService.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.tokenStore.getToken(tokenHash);

    if (!record) {
      throw new BadRequestException('INVALID_RESET_TOKEN');
    }

    if (Date.now() > record.expiresAt) {
      await this.tokenStore.deleteToken(tokenHash);
      throw new BadRequestException('RESET_TOKEN_EXPIRED');
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user) {
      await this.tokenStore.deleteToken(tokenHash);
      throw new NotFoundException('User not found');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    await this.tokenStore.deleteToken(tokenHash);
  }
}
