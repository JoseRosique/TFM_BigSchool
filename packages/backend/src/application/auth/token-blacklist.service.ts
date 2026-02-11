import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService implements OnModuleDestroy {
  private blacklistedTokens = new Map<string, NodeJS.Timeout>();

  blacklistToken(token: string, expiresInSeconds: number): void {
    if (expiresInSeconds <= 0) {
      // Coerce to a minimum of 10 seconds effectively or just return/log
      console.warn(
        `Invalid expiresInSeconds: ${expiresInSeconds} for token blacklist. Using default min.`,
      );
      expiresInSeconds = 10;
      // or throw new Error('Invalid expiration');
    }

    // Si el token ya existe en el blacklist, limpiar el timeout anterior
    if (this.blacklistedTokens.has(token)) {
      const timeout = this.blacklistedTokens.get(token);
      if (timeout) {
        clearTimeout(timeout);
      }
    }

    // Agregar token al blacklist
    const timeout = setTimeout(() => {
      this.blacklistedTokens.delete(token);
    }, expiresInSeconds * 1000);

    this.blacklistedTokens.set(token, timeout);
  }

  isBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  onModuleDestroy(): void {
    // Limpiar todos los timeouts al destruir el módulo
    this.blacklistedTokens.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.blacklistedTokens.clear();
  }
}
