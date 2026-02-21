import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ConfigController
 * Expone configuración pública (no sensible) necesaria para el frontend
 */
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /api/config/public
   * Devuelve configuración pública necesaria para el frontend
   */
  @Get('public')
  getPublicConfig() {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');

    if (!googleClientId) {
      console.warn('⚠️  GOOGLE_CLIENT_ID not configured');
    }

    return {
      googleClientId,
    };
  }
}
