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
    console.log('🔄 GoogleAuthService: Attempting to load Google SDK...');

    // Si el SDK ya está cargado
    if (typeof google !== 'undefined' && google?.accounts?.id) {
      console.log('✅ GoogleAuthService: Google SDK already loaded');
      this.sdkReady$.next();
      return;
    }

    // Si ya se inició la carga, esperar
    if (this.sdkLoadStarted) {
      console.log('⏳ GoogleAuthService: SDK load already in progress, waiting...');
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

    console.log('🚀 GoogleAuthService: Creating and injecting Google SDK script');

    // Timeout de 10 segundos para carga del SDK
    const timeoutId = window.setTimeout(() => {
      const err = new Error(
        'GOOGLE_SDK_LOAD_FAILED: timeout (10s) waiting for Google GSI SDK to load',
      );
      console.error('⏱️ GoogleAuthService:', err.message);
      this.sdkReady$.error(err);
    }, 10000);

    // Handler al cargar exitosamente
    script.onload = () => {
      window.clearTimeout(timeoutId);
      console.log('✅ GoogleAuthService: Google SDK script loaded');

      // Verificar que el SDK esté disponible globalmente
      if (typeof google === 'undefined' || !google?.accounts?.id) {
        const err = new Error(
          'GOOGLE_SDK_LOAD_FAILED: script loaded but window.google.accounts.id unavailable',
        );
        console.error('❌ GoogleAuthService:', err.message);
        this.sdkReady$.error(err);
        return;
      }

      console.log('🎉 GoogleAuthService: Google SDK ready');
      this.sdkReady$.next();
    };

    // Handler en caso de error
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      const err = new Error(
        'GOOGLE_SDK_LOAD_FAILED: network error or CSP directive blocked GSI script',
      );
      console.error('❌ GoogleAuthService:', err.message);
      console.warn('⚠️  Posibles causas:');
      console.warn('   1. Content Security Policy (CSP) bloqueando el script');
      console.warn('   2. Problemas de red o conectividad');
      console.warn('   3. URL del SDK no accesible');
      console.log('▶️  Solución: Verifica que el CSP permita https://accounts.google.com');
      this.sdkReady$.error(err);
    };

    // Inyectar script en el head
    this.document.head.appendChild(script);
    console.log('📄 GoogleAuthService: Google SDK script injected to DOM');

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
    console.log('🔐 GoogleAuthService: Attempting to initialize with googleClientId...');

    if (!environment.googleClientId) {
      const err = new Error('GOOGLE_CLIENT_ID not configured in environment');
      console.error('❌ GoogleAuthService:', err.message);
      throw err;
    }

    if (typeof google === 'undefined' || !google?.accounts?.id) {
      const err = new Error('GOOGLE_SDK_NOT_READY: Google SDK not loaded or not available');
      console.error('❌ GoogleAuthService:', err.message);
      throw err;
    }

    console.log(
      '✅ GoogleAuthService: Initializing with client_id:',
      environment.googleClientId.substring(0, 20) + '...',
    );

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: onCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'redirect', // Redirect mode para evitar COOP y popup bloqueos
    });

    console.log('✅ GoogleAuthService: Google Accounts ID initialized successfully');
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
