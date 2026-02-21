import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { ReplaySubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

declare var google: any;

export interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private readonly sdkReady$ = new ReplaySubject<void>(1);
  private sdkLoadStarted = false;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  /**
   * Carga dinámicamente el SDK de Google Identity Services
   * Retorna un Promise que se resuelve cuando el SDK está listo
   * Maneja duplicados y timeouts
   */
  async loadSdk(): Promise<void> {
    // Si el SDK ya está cargado
    if (typeof google !== 'undefined' && google?.accounts?.id) {
      this.sdkReady$.next();
      return;
    }

    // Si ya se inició la carga, esperar
    if (this.sdkLoadStarted) {
      return firstValueFrom(this.sdkReady$);
    }

    this.sdkLoadStarted = true;

    // Verificar si el script ya existe en el DOM
    const existing = this.document.getElementById('google-gsi-sdk') as HTMLScriptElement | null;
    if (existing) {
      // Si el SDK ya está cargado, emitir inmediatamente
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        this.sdkReady$.next();
        return;
      }
      // Si el script existe pero aún no ha cargado, adjuntar listeners
      return new Promise<void>((resolve, reject) => {
        existing.onload = () => {
          if (typeof google !== 'undefined' && google?.accounts?.id) {
            this.sdkReady$.next();
            resolve();
          } else {
            const err = new Error(
              'GOOGLE_SDK_LOAD_FAILED: script loaded but window.google.accounts.id unavailable',
            );
            this.sdkReady$.error(err);
            reject(err);
          }
        };
        existing.onerror = () => {
          const err = new Error('GOOGLE_SDK_LOAD_FAILED: network/CSP blocked GSI script');
          this.sdkReady$.error(err);
          reject(err);
        };
      });
    }

    // Crear y configurar elemento script
    const script = this.document.createElement('script');
    script.id = 'google-gsi-sdk';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    // Timeout de 10 segundos para carga del SDK
    const timeoutId = window.setTimeout(() => {
      this.sdkReady$.error(
        new Error('GOOGLE_SDK_LOAD_FAILED: timeout (10s) waiting for Google GSI SDK to load'),
      );
    }, 10000);

    // Handler al cargar exitosamente
    script.onload = () => {
      window.clearTimeout(timeoutId);

      // Verificar que el SDK esté disponible globalmente
      if (typeof google === 'undefined' || !google?.accounts?.id) {
        this.sdkReady$.error(
          new Error(
            'GOOGLE_SDK_LOAD_FAILED: script loaded but window.google.accounts.id unavailable',
          ),
        );
        return;
      }

      this.sdkReady$.next();
    };

    // Handler en caso de error
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      this.sdkReady$.error(
        new Error('GOOGLE_SDK_LOAD_FAILED: network error or CSP directive blocked GSI script'),
      );
    };

    // Inyectar script en el head
    this.document.head.appendChild(script);

    // Retornar Promise basada en Observable
    return firstValueFrom(this.sdkReady$);
  }

  /**
   * Inicializa Google Accounts ID con el cliente configurado en environment
   * Debe llamarse después de loadSdk()
   *
   * @param onCredential Callback que se ejecuta al recibir credencial
   */
  initialize(onCredential: (response: GoogleCredentialResponse) => void): void {
    if (!environment.googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID not configured in environment');
    }

    if (typeof google === 'undefined' || !google?.accounts?.id) {
      throw new Error('GOOGLE_SDK_NOT_READY: Google SDK not loaded or not available');
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: onCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
  }

  /**
   * Renderiza el botón de Google Sign-In en el contenedor especificado
   * Debe llamarse dentro de ngZone.runOutsideAngular() para evitar CD issues
   *
   * @param container HTMLElement donde renderizar el botón
   */
  renderButton(container: HTMLElement): void {
    if (typeof google === 'undefined' || !google?.accounts?.id) {
      throw new Error('GOOGLE_SDK_NOT_READY: cannot render button without SDK');
    }

    if (!container) {
      throw new Error('INVALID_CONTAINER: provided container is null or undefined');
    }

    google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      width: '280',
      text: 'signin_with',
      shape: 'pill',
      locale: 'es',
    });
  }

  /**
   * Detiene el flujo de autenticación de Google
   */
  cancelLogin(): void {
    if (typeof google !== 'undefined' && google?.accounts?.id?.cancel) {
      google.accounts.id.cancel();
    }
  }
}
