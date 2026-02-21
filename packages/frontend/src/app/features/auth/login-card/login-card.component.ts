import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {
  GoogleAuthService,
  GoogleCredentialResponse,
} from '../../../core/services/google-auth.service';
import { GoogleAuthErrorMapper } from '../../../core/services/google-auth-error.mapper';

@Component({
  selector: 'app-login-card',
  templateUrl: './login-card.component.html',
  styleUrls: ['./login-card.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class LoginCardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleBtnHost', { static: false }) googleBtnHost?: ElementRef<HTMLDivElement>;

  gsiErrorKey = signal<string>('');
  isLoading = signal<boolean>(false);
  private destroyed = false;

  constructor(
    private googleAuth: GoogleAuthService,
    private ngZone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    // Verificar que el contenedor existe en el DOM antes de proceder
    if (!this.googleBtnHost?.nativeElement) {
      this.gsiErrorKey.set('AUTH.GOOGLE_SIGN_IN.ERRORS.CONTAINER_NOT_FOUND');
      return;
    }

    this.isLoading.set(true);

    // Ejecutar carga y renderización FUERA de Angular Zone
    // Esto evita que el SDK de Google interfiera con la detección de cambios angular
    this.ngZone.runOutsideAngular(async () => {
      try {
        // 1. Cargar SDK de forma asíncrona
        await this.googleAuth.loadSdk();

        // Verificar si el componente fue destruido mientras esperaba
        if (this.destroyed) {
          return;
        }

        // 2. Inicializar con callback (se ejecutará dentro de Zone cuando se llame)
        this.googleAuth.initialize((response: GoogleCredentialResponse) => {
          this.ngZone.run(() => {
            this.handleGoogleCredential(response);
          });
        });

        // 3. Renderizar botón (todavía fuera de Zone para evitar change detection)
        if (this.googleBtnHost?.nativeElement) {
          this.googleAuth.renderButton(this.googleBtnHost.nativeElement);
        }

        // Volver a Zone y limpiar loading (con verificación de destrucción)
        this.ngZone.run(() => {
          if (!this.destroyed) {
            this.isLoading.set(false);
            this.gsiErrorKey.set('');
          }
        });
      } catch (err: any) {
        // Manejar errores dentro de Zone para actualizar UI (solo si no fue destruido)
        this.ngZone.run(() => {
          if (!this.destroyed) {
            const errorMsg = err?.message ?? 'Unknown error initializing Google Sign-In';
            const i18nKey = GoogleAuthErrorMapper.mapErrorToI18nKey(errorMsg);
            this.gsiErrorKey.set(i18nKey);
            this.isLoading.set(false);
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    // Marcar como destruido para evitar operaciones asincrónicas
    this.destroyed = true;

    // Limpiar credenciales si es necesario
    try {
      this.googleAuth.cancelLogin();
    } catch {
      // Ignorar error si el SDK no está disponible
    }
  }

  /**
   * Procesa la respuesta de credencial de Google
   * Este método se ejecuta DENTRO de Angular Zone para permitir actualizaciones de UI
   *
   * @param response Respuesta con el JWT de Google
   */
  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    // TODO: Enviar response.credential al backend para validación
    // La credencial es un JWT que debe validarse en el servidor usando la clave pública de Google
  }
}
