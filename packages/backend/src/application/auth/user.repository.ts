import { User } from '../../domain/entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByNickname(nickname: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  /**
   * Atomic find-or-create operation for Google Sign-In
   * Prevents race conditions on concurrent logins with the same email
   * Assigns the system default avatar (avatar-1.svg) on first registration
   */
  findOrCreateGoogleUser(email: string, name: string): Promise<{ user: User; created: boolean }>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
