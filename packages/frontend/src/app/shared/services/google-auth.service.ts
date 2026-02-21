import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { LoginDTO } from '@meetwithfriends/shared';
import { firstValueFrom } from 'rxjs';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleInitConfig) => void;
          prompt: (momentListener?: (notification: MomentNotification) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
          renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void;
        };
      };
    };
  }
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: 'popup' | 'redirect';
}

interface GsiButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
  locale?: string;
}

type GoogleButtonTheme = NonNullable<GsiButtonConfiguration['theme']>;
type GoogleButtonShape = NonNullable<GsiButtonConfiguration['shape']>;

interface MomentNotification {
  /**
   * Momento del flujo:
   * - 'display': Se mostró el prompt
   * - 'skipped_moment': El prompt fue saltado
   * - 'dismissed_moment': El usuario cerró el prompt
   */
  moment_type: 'display' | 'skipped_moment' | 'dismissed_moment';
  /**
   * Razón del skip/dismiss:
   * - 'user_cancel': Usuario cerró manualmente
   * - 'tap_outside': Click fuera del modal
   * - 'issuing_failed': Falló la emisión del credential
   */
  skipped_reason?: string;
  dismissed_reason?: 'credential_returned' | 'cancel' | 'tap_outside';
}

/**
 * Google Auth Service
 * Gestiona la integración con Google Sign-In:
 * - Carga dinámica del SDK de Google
 * - Inicialización de Google One Tap
 * - Envío de credenciales al backend
 * - Re-inicialización robusta tras cierres del modal
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly googleClientId = environment.googleClientId;
  private readonly defaultButtonShape: GoogleButtonShape = 'circle';

  private sdkLoaded = false;
  private sdkLoadPromise: Promise<void> | null = null;

  // Callbacks actuales (para reutilizar en re-intentos)
  private currentOnSuccess: ((response: LoginDTO.Response) => void) | null = null;
  private currentOnError: ((error: any) => void) | null = null;

  /**
   * Carga el SDK de Google Sign-In dinámicamente
   * Incluye manejo de errores robusto para CSP y fallas de red
   */
  async loadGoogleSDK(): Promise<void> {
    if (this.sdkLoaded) {
      return Promise.resolve();
    }

    if (this.sdkLoadPromise) {
      return this.sdkLoadPromise;
    }

    this.sdkLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.sdkLoaded = true;
        console.log('✅ Google SDK loaded successfully');
        resolve();
      };

      script.onerror = (error) => {
        console.error('❌ Failed to load Google SDK:', error);
        console.error('⚠️  Posibles causas:');
        console.error('   1. Content Security Policy (CSP) bloqueando el script');
        console.error('   2. Problemas de red o conectividad');
        console.error('   3. URL del SDK no accesible');
        console.error('\n▶️  Solución: Verifica que el CSP permita https://accounts.google.com');
        this.sdkLoadPromise = null;
        reject(new Error('GOOGLE_SDK_LOAD_FAILED'));
      };

      document.head.appendChild(script);
    });

    return this.sdkLoadPromise;
  }

  /**
   * Cancela cualquier sesión de Google Sign-In pendiente
   * Esto es crucial para permitir múltiples intentos del prompt
   */
  private cancelPendingPrompt(): void {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.cancel();
        console.log('🧹 Google prompt cancelado (limpieza de estado)');
      } catch (error) {
        console.warn('⚠️ Error al cancelar prompt (puede ser que no haya uno activo):', error);
      }
    }
  }

  /**
   * Maneja la respuesta de credencial de Google
   * Centraliza la lógica para evitar duplicación
   */
  private async handleCredentialResponse(credential: string): Promise<void> {
    try {
      console.log('🔐 Credencial de Google recibida, enviando al backend...');
      const loginResponse = await this.sendCredentialToBackend(credential);

      if (this.currentOnSuccess) {
        this.currentOnSuccess(loginResponse);
      }
    } catch (error) {
      console.error('❌ Error al procesar credencial de Google:', error);
      if (this.currentOnError) {
        this.currentOnError(error);
      }
    }
  }

  /**
   * Callback invocado cuando hay eventos del flujo de Google (cierre, skip, etc.)
   */
  private handleMomentNotification(notification: MomentNotification): void {
    console.log('📊 Google Moment Notification:', notification);

    switch (notification.moment_type) {
      case 'display':
        console.log('👁️ Google prompt mostrado al usuario');
        break;
      case 'skipped_moment':
        console.log('⏭️ Google prompt saltado. Razón:', notification.skipped_reason);
        break;
      case 'dismissed_moment':
        console.log('🚪 Usuario cerró el prompt de Google. Razón:', notification.dismissed_reason);
        // IMPORTANTE: No llamamos a onError aquí porque no es un error real
        // El usuario simplemente decidió no continuar
        // El botón debe permanecer habilitado para intentos futuros
        if (this.currentOnError && notification.dismissed_reason !== 'credential_returned') {
          // Notificamos al componente que puede limpiar el estado de loading
          // pero sin mostrar un error al usuario (es una cancelación voluntaria)
          this.currentOnError({ userCancelled: true, reason: notification.dismissed_reason });
        }
        break;
    }
  }

  /**
   * Inicializa Google Sign-In con callback
   * Se llama cuando el usuario hace clic en el botón de Google
   *
   * IMPORTANTE: Este método se puede llamar múltiples veces de forma segura.
   * Cada llamada re-inicializa el SDK para permitir nuevos intentos tras cierres.
   */
  async initializeGoogleSignIn(
    onSuccess: (response: LoginDTO.Response) => void,
    onError: (error: any) => void,
  ): Promise<void> {
    try {
      if (!this.googleClientId) {
        throw new Error('GOOGLE_CLIENT_ID not configured in environment');
      }

      // Guardar callbacks para reutilizar en re-intentos
      this.currentOnSuccess = onSuccess;
      this.currentOnError = onError;

      await this.loadGoogleSDK();

      if (!window.google?.accounts?.id) {
        throw new Error('GOOGLE_SDK_NOT_AVAILABLE');
      }

      // ⚠️ CLAVE: Cancelar cualquier prompt anterior para permitir re-inicialización
      this.cancelPendingPrompt();

      console.log('🔧 Inicializando Google Sign-In...');

      // RE-INICIALIZAR siempre (no solo la primera vez)
      // Esto es necesario para que prompt() funcione en intentos subsecuentes
      window.google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: { credential: string }) => {
          this.handleCredentialResponse(response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup', // popup es más robusto para re-intentos que redirect
      });

      console.log('✅ Google Sign-In inicializado correctamente');
    } catch (error) {
      console.error('❌ GoogleAuthService: Failed to initialize Google Sign-In:', error);
      throw error;
    }
  }

  /**
   * Muestra el One Tap prompt de Google
   *
   * IMPORTANTE: Este método puede llamarse múltiples veces.
   * La llamada a cancel() previa garantiza que Google permita mostrar el prompt de nuevo.
   */
  async showOneTap(): Promise<void> {
    await this.loadGoogleSDK();

    if (!window.google?.accounts?.id) {
      throw new Error('GOOGLE_SDK_NOT_AVAILABLE');
    }

    // ⚠️ CLAVE: Cancelar antes de mostrar permite múltiples intentos
    this.cancelPendingPrompt();

    console.log('🚀 Mostrando Google One Tap prompt...');

    // El callback de momentListener permite detectar cuando el usuario cierra el modal
    window.google.accounts.id.prompt((notification) => {
      // Este callback se ejecuta cuando el prompt se cierra/completa
      console.log('📢 Prompt notification:', notification);
    });
  }

  /**
   * Detecta el tema actual de la app/sistema para el botón de Google.
   */
  private getCurrentGoogleButtonTheme(): GoogleButtonTheme {
    const appTheme = document.documentElement.getAttribute('data-theme');

    if (appTheme === 'dark') {
      return 'filled_black';
    }

    if (appTheme === 'light') {
      return 'filled_blue';
    }

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'filled_black';
    }

    return 'outline';
  }

  /**
   * Renderiza el botón nativo de Google (GSI Branded Button)
   *
   * @param parent - Elemento HTML donde se renderizará el botón
   * @param options - Configuración del botón (tema, tamaño, texto, etc.)
   *
   * IMPORTANTE:
   * - El elemento parent debe existir en el DOM antes de llamar a este método
   * - Si el componente se destruye y recrea, llamar de nuevo para re-renderizar
   * - El botón usa el callback configurado en initialize()
   */
  async renderButton(
    parent: HTMLElement,
    options: Partial<GsiButtonConfiguration> = {},
  ): Promise<void> {
    await this.loadGoogleSDK();

    if (!window.google?.accounts?.id) {
      throw new Error('GOOGLE_SDK_NOT_AVAILABLE');
    }

    const detectedWidth =
      parent.offsetWidth ||
      parent.parentElement?.offsetWidth ||
      Math.floor(parent.getBoundingClientRect().width) ||
      300;
    const safeRenderWidth = Math.max(220, detectedWidth - 4);

    const theme = options.theme ?? this.getCurrentGoogleButtonTheme();
    const shape = options.shape ?? this.defaultButtonShape;

    // Configuración por defecto optimizada para UX
    const defaultOptions: GsiButtonConfiguration = {
      type: 'standard',
      theme,
      size: 'large',
      text: 'signin_with',
      shape,
      logo_alignment: 'left',
      width: safeRenderWidth,
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      width: options.width ?? safeRenderWidth,
    };

    console.log('🎨 Renderizando botón nativo de Google con opciones:', finalOptions);

    try {
      // Limpiar contenido anterior del contenedor (evita duplicados)
      parent.innerHTML = '';

      // Renderizar botón nativo
      window.google.accounts.id.renderButton(parent, finalOptions);

      console.log('✅ Botón nativo de Google renderizado correctamente');
    } catch (error) {
      console.error('❌ Error al renderizar botón nativo de Google:', error);
      throw error;
    }
  }

  /**
   * Envía el token de Google al backend para validación
   */
  private async sendCredentialToBackend(credential: string): Promise<LoginDTO.Response> {
    return firstValueFrom(
      this.http.post<LoginDTO.Response>(`${this.apiUrl}/google`, { credential }),
    );
  }
}
