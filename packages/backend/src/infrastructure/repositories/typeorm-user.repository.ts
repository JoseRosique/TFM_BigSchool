import { UserRepository } from '@/application/auth/user.repository';
import { User } from '@/domain/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { nickname } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  /**
   * Atomic find-or-create operation for Google Sign-In
   * Uses database-level unique constraint to prevent race conditions
   */
  async findOrCreateGoogleUser(
    email: string,
    name: string,
    avatarUrl?: string,
  ): Promise<{ user: User; created: boolean }> {
    // Try to find existing user first (optimistic read)
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      return { user: existingUser, created: false };
    }

    // User doesn't exist, attempt atomic creation
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let nickname: string | undefined;

    try {
      // Double-check within transaction (prevents race condition)
      let user = await queryRunner.manager.findOne(User, { where: { email } });

      if (user) {
        // Another concurrent request created it
        await queryRunner.commitTransaction();
        return { user, created: false };
      }

      // Generate unique nickname with random suffix to reduce race conditions
      const baseNickname = email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const randomSuffix = randomBytes(3).toString('hex');
      nickname = `${baseNickname}_${randomSuffix}`;
      let counter = 1;

      // Fallback: if still collides, add counter
      while (await queryRunner.manager.findOne(User, { where: { nickname } })) {
        nickname = `${baseNickname}_${randomSuffix}_${counter}`;
        counter++;
      }

      // Google accounts don't need password (passwordHash is nullable)
      const passwordHash = null;

      const newUser = queryRunner.manager.create(User, {
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
        isGoogleAccount: true,
      });

      user = await queryRunner.manager.save(newUser);
      await queryRunner.commitTransaction();

      console.log(`✅ New Google user created: ${user.email} (${user.id})`);
      return { user, created: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Handle unique constraint violations (concurrent inserts)
      const isDuplicateError =
        error instanceof Error &&
        (error.message.includes('duplicate key') || error.message.includes('UNIQUE constraint'));

      if (isDuplicateError) {
        // Fallback: fetch the user created by the concurrent request (by email or nickname)
        let user = await this.findByEmail(email);
        if (!user && nickname) {
          user = await this.findByNickname(nickname);
        }
        if (user) {
          console.log(`ℹ️  Google user already created by concurrent request: ${email}`);
          return { user, created: false };
        }
      }

      console.error('Atomic Google user creation failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
