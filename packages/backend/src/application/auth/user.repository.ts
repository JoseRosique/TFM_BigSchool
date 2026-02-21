import { User } from '../../domain/entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByNickname(nickname: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  /**
   * Atomic find-or-create operation for Google Sign-In
   * Prevents race conditions on concurrent logins with the same email
   */
  findOrCreateGoogleUser(
    email: string,
    name: string,
    avatarUrl?: string,
  ): Promise<{ user: User; created: boolean }>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
