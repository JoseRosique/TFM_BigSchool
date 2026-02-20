import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { LoginDTO } from '@meetwithfriends/shared';
import { Observable, from, firstValueFrom } from 'rxjs';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleInitConfig) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, options: GoogleButtonConfig) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
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
  context?: 'signin' | 'signup' | 'use';
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
}

/**
 * Google Auth Service
 * Gestiona la integración con Google Sign-In:
 * - Carga dinámica del SDK de Google
 * - Inicialización de Google One Tap
 * - Envío de credenciales al backend
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Client ID de Google (debe configurarse en environment)
  private readonly clientId: string;

  // Estado de carga del SDK
  isLoading = signal(false);
  private sdkLoaded = false;
  private sdkLoadPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor() {
    if (!environment.googleClientId) {
      throw new Error('Missing GOOGLE_CLIENT_ID in environment configuration');
    }
    this.clientId = environment.googleClientId;
  }

  /**
   * Carga el SDK de Google Sign-In dinámicamente
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
        this.sdkLoadPromise = null;
        reject(new Error('GOOGLE_SDK_LOAD_FAILED'));
      };

      document.head.appendChild(script);
    });

    return this.sdkLoadPromise;
  }

  /**
   * Inicializa Google Sign-In con callback
   */
  async initializeGoogleSignIn(
    onSuccess: (response: LoginDTO.Response) => void,
    onError: (error: any) => void,
  ): Promise<void> {
    try {
      await this.loadGoogleSDK();

      if (!window.google?.accounts?.id) {
        throw new Error('GOOGLE_SDK_NOT_AVAILABLE');
      }

      // Configurar Google Sign-In
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: async (response: { credential: string }) => {
          this.isLoading.set(true);
          try {
            // Enviar token al backend
            const loginResponse = await this.sendCredentialToBackend(response.credential);
            this.isLoading.set(false);
            onSuccess(loginResponse);
          } catch (error) {
            this.isLoading.set(false);
            onError(error);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      console.log('✅ Google Sign-In initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Sign-In:', error);
      throw error;
    }
  }

  /**
   * Renderiza el botón de Google en un elemento HTML
   */
  async renderButton(
    element: HTMLElement,
    options: Partial<GoogleButtonConfig> = {},
  ): Promise<void> {
    await this.loadGoogleSDK();

    if (!window.google?.accounts?.id) {
      throw new Error('GOOGLE_SDK_NOT_AVAILABLE');
    }

    // Ensure Google Sign-In is initialized before rendering button
    if (!this.isInitialized) {
      throw new Error('GOOGLE_NOT_INITIALIZED: Call initializeGoogleSignIn() first');
    }

    const defaultOptions: GoogleButtonConfig = {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: element.offsetWidth || 320,
    };

    window.google.accounts.id.renderButton(element, { ...defaultOptions, ...options });
  }

  /**
   * Muestra el One Tap prompt de Google
   */
  async showOneTap(): Promise<void> {
    await this.loadGoogleSDK();

    if (!window.google?.accounts?.id) {
      throw new Error('GOOGLE_SDK_NOT_AVAILABLE');
    }

    // Ensure Google Sign-In is initialized before showing One Tap
    if (!this.isInitialized) {
      throw new Error('GOOGLE_NOT_INITIALIZED: Call initializeGoogleSignIn() first');
    }

    window.google.accounts.id.prompt();
  }

  /**
   * Cancela el One Tap prompt
   */
  cancelOneTap(): void {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
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

  /**
   * Método público para login con Google (llamado por componentes)
   */
  loginWithGoogle(): Observable<LoginDTO.Response> {
    return from(this.performGoogleLogin());
  }

  /**
   * Realiza el flujo completo de Google login
   */
  private async performGoogleLogin(): Promise<LoginDTO.Response> {
    return new Promise<LoginDTO.Response>(async (resolve, reject) => {
      try {
        await this.initializeGoogleSignIn(
          (response) => resolve(response),
          (error) => reject(error),
        );
        await this.showOneTap();
      } catch (error) {
        reject(error);
      }
    });
  }
}
