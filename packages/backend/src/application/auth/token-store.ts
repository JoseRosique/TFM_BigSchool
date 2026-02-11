import { Injectable } from '@nestjs/common';

export interface ResetTokenRecord {
  userId: string;
  expiresAt: number;
}

export interface TokenStore {
  setToken(id: string, record: ResetTokenRecord, ttlMs: number): Promise<void>;
  getToken(id: string): Promise<ResetTokenRecord | null>;
  deleteToken(id: string): Promise<void>;
}

export const TOKEN_STORE = 'TOKEN_STORE';

@Injectable()
export class InMemoryTokenStore implements TokenStore {
  private tokens = new Map<string, ResetTokenRecord>();

  async setToken(id: string, record: ResetTokenRecord, ttlMs: number): Promise<void> {
    this.tokens.set(id, record);
    // Simulate TTL
    setTimeout(() => {
      this.tokens.delete(id);
    }, ttlMs);
  }

  async getToken(id: string): Promise<ResetTokenRecord | null> {
    return this.tokens.get(id) || null;
  }

  async deleteToken(id: string): Promise<void> {
    this.tokens.delete(id);
  }
}
