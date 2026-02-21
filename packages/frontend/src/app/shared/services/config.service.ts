import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  googleClientId: string;
}

/**
 * ConfigService
 * Carga configuración dinámica desde el backend antes del bootstrap de la app
 */
@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Señal reactiva con la configuración cargada
  private readonly config = signal<AppConfig | null>(null);

  // Signal privado (writable) para control interno
  private readonly _configLoaded = signal(false);

  // Signal público (readonly) para que componentes verifiquen si está cargado
  readonly configLoaded = this._configLoaded.asReadonly();

  /**
   * Obtiene la configuración actual
   */
  getConfig(): AppConfig | null {
    return this.config();
  }

  /**
   * Obtiene el Google Client ID
   * Retorna cadena vacía si no está disponible (sin lanzar error)
   */
  getGoogleClientId(): string {
    const config = this.config();
    return config?.googleClientId || '';
  }

  /**
   * Verifica si la configuración está cargada
   */
  isConfigLoaded(): boolean {
    return this.configLoaded();
  }

  /**
   * Carga la configuración desde el backend
   * CRÍTICO: Retorna Promise que debe ser esperada por el llamador antes de usar la config
   */
  async loadConfig(): Promise<void> {
    const url = `${this.apiUrl}/config/public`;
    console.log('📡 [2º] Enviando petición al backend...');
    console.log('   → URL:', url);

    try {
      // CRÍTICO: Usar firstValueFrom para obtener una Promise real
      const data = await firstValueFrom(this.http.get<AppConfig>(url));

      console.log('✅ [3º] Configuración cargada y Signal actualizado');
      console.log('   → Respuesta del backend:');
      console.dir(data);

      // Verificar que la respuesta tenga la estructura esperada
      if (!data || typeof data !== 'object') {
        throw new Error('Respuesta del backend con formato inválido');
      }

      // Mapeo: Si el backend envía "clientId" en lugar de "googleClientId", ajustar aquí
      const googleClientId = data.googleClientId || (data as any).clientId || '';

      // Asignar al Signal privado
      this.config.set({ googleClientId });

      // CRÍTICO: Activar el Signal ANTES de que la promesa se resuelva
      this._configLoaded.set(true);

      console.log('   → Signal configLoaded() =', this.configLoaded());
      console.log(
        '   → Google Client ID:',
        googleClientId
          ? '✓ Loaded (...' + googleClientId.slice(-20) + ')'
          : '⚠️  VACÍO - Backend no proporcionó el ID',
      );
      console.log('🔓 [4º] Promesa resuelta - Angular continuará con el bootstrap');
    } catch (error) {
      console.error('❌ [ERROR] No se pudo cargar la configuración');
      console.error('   → URL intentada:', url);
      console.error('   → Tipo de error:', error instanceof Error ? error.name : 'Unknown');
      console.error('   → Detalles:', error);

      // Configuración por defecto para que la app no se quede bloqueada
      this.config.set({ googleClientId: '' });
      this._configLoaded.set(true);

      console.warn('⚠️  [FALLBACK] Usando configuración vacía para permitir arranque');
      console.log('   → Signal configLoaded() =', this.configLoaded());
      console.log('🔓 [4º] Promesa resuelta con error manejado - Angular continuará');
    }
  }
}
