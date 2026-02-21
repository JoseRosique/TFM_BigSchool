import {
  Component,
  signal,
  inject,
  effect,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { LanguageService } from '../../../shared/services/language.service';
import { GoogleAuthService } from '../../../shared/services/google-auth.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { LoginDTO } from '@meetwithfriends/shared';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { isValidEmail } from '../../../shared/utils/validation.utils';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [TranslateModule, FormsModule],
  styleUrls: ['./login-card.component.scss'],
  templateUrl: './login-card.component.html',
})
export class LoginCardComponent implements OnDestroy, AfterViewInit {
  @ViewChild('googleLoginBtn', { static: false }) googleLoginBtn!: ElementRef<HTMLDivElement>;

  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly ngZone = inject(NgZone);

  email = signal('');
  password = signal('');
  errors = signal<{ [key: string]: string }>({});
  loading = signal(false);
  success = signal(false);
  forgotOpen = signal(false);
  forgotEmail = signal('');
  forgotErrors = signal<{ [key: string]: string }>({});
  forgotLoading = signal(false);
  forgotSuccess = signal(false);
  forgotMessage = signal('');

  private forgotAutoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRenderedWidth = 0;

  constructor() {
    effect(() => {
      this.themeService.theme();
      this.scheduleGoogleButtonRender();
    });
  }

  ngOnDestroy(): void {
    if (this.forgotAutoCloseTimer !== null) {
      clearTimeout(this.forgotAutoCloseTimer);
      this.forgotAutoCloseTimer = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.resizeDebounceTimer !== null) {
      clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = null;
    }
  }

  ngAfterViewInit(): void {
    // Inicializar Google Sign-In y renderizar botón nativo después de que la vista esté lista
    this.initializeGoogleButton();

    if (typeof ResizeObserver !== 'undefined' && this.googleLoginBtn?.nativeElement) {
      this.ngZone.runOutsideAngular(() => {
        this.resizeObserver = new ResizeObserver(() => {
          this.scheduleGoogleButtonRender();
        });

        if (this.googleLoginBtn.nativeElement.parentElement) {
          this.resizeObserver.observe(this.googleLoginBtn.nativeElement.parentElement);
        }
      });
    }
  }

  private scheduleGoogleButtonRender(): void {
    if (this.resizeDebounceTimer !== null) {
      clearTimeout(this.resizeDebounceTimer);
    }

    this.resizeDebounceTimer = setTimeout(() => {
      this.resizeDebounceTimer = null;
      void this.renderGoogleButton();
    }, 200);
  }

  private async initializeGoogleButton(): Promise<void> {
    try {
      // Configurar callbacks para el flujo de autenticación
      await this.ngZone.runOutsideAngular(async () =>
        this.googleAuthService.initializeGoogleSignIn(
          // Callback de éxito
          (response: LoginDTO.Response) => {
            this.ngZone.run(() => {
              this.loading.set(false);
              this.success.set(true);
              this.authService.setTokens(response.accessToken, response.refreshToken);
              if (response.language) {
                this.languageService.setLang(response.language);
              }
              this.toastService.success(this.translate.instant('LOGIN.SUCCESS'));

              // Cargar perfil y redirigir al dashboard
              this.authService.getProfile().subscribe({
                next: () => {
                  this.router.navigate(['/dashboard']);
                },
                error: () => {
                  this.authService.clearAccessToken();
                  const errorMsg = this.translate.instant('LOGIN.ERROR.UNKNOWN');
                  this.errors.set({ general: errorMsg });
                  this.loading.set(false);
                },
              });
            });
          },
          // Callback de error
          (error) => {
            this.ngZone.run(() => {
              console.error('[LoginCardComponent] Google login error:', error);
              this.loading.set(false);

              // Si el usuario simplemente cerró el modal, no mostramos error
              if (error?.userCancelled) {
                console.log('ℹ️ Usuario cerró el modal de Google (no es un error)');
                return;
              }

              // Error real: mostrar mensaje
              let errorMsg = this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED');
              if (error?.error?.message) {
                errorMsg = error.error.message;
              }
              this.errors.set({ general: errorMsg });
              this.toastService.error(this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED'));
            });
          },
        ),
      );

      await this.renderGoogleButton();
    } catch (error) {
      console.error('[LoginCardComponent] Error al inicializar botón de Google:', error);
      // Set error state and show fallback UI
      this.errors.set({
        general:
          this.translate.instant('LOGIN.ERROR.GOOGLE_INIT_FAILED') ||
          'Error initializing Google Sign-In',
      });
      this.toastService.error(this.translate.instant('LOGIN.ERROR.GOOGLE_INIT_FAILED'));
    }
  }

  private async renderGoogleButton(): Promise<void> {
    if (!this.googleLoginBtn?.nativeElement) {
      return;
    }

    const containerWidth =
      this.googleLoginBtn.nativeElement.parentElement?.offsetWidth ||
      this.googleLoginBtn.nativeElement.offsetWidth ||
      0;

    if (Math.abs(containerWidth - this.lastRenderedWidth) <= 5) {
      return;
    }

    this.lastRenderedWidth = containerWidth;

    await this.ngZone.runOutsideAngular(() =>
      this.googleAuthService.renderButton(this.googleLoginBtn.nativeElement, {
        type: 'standard',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      }),
    );
  }

  validate() {
    const errors: { [key: string]: string } = {};
    const email = this.email();
    const password = this.password();
    if (!isValidEmail(email)) errors['email'] = this.translate.instant('LOGIN.VALIDATION.EMAIL');
    if (!password) errors['password'] = this.translate.instant('LOGIN.VALIDATION.PASSWORD');
    return errors;
  }

  onInput() {
    this.errors.set(this.validate());
  }

  private validateForgot() {
    const errors: { [key: string]: string } = {};
    const email = this.forgotEmail();
    if (!isValidEmail(email)) {
      errors['email'] = this.translate.instant('LOGIN.VALIDATION.EMAIL');
    }
    return errors;
  }

  onForgotInput() {
    this.forgotErrors.set(this.validateForgot());
  }

  private mapValidationErrors(err: HttpErrorResponse): { [key: string]: string } | null {
    if (err.status !== 400 || !Array.isArray(err.error?.message)) {
      return null;
    }

    const errors: { [key: string]: string } = {};
    for (const message of err.error.message) {
      const normalized = String(message).toLowerCase();
      if (normalized.includes('email')) {
        errors['email'] = this.translate.instant('LOGIN.VALIDATION.EMAIL');
      }
      if (normalized.includes('password')) {
        errors['password'] = this.translate.instant('LOGIN.VALIDATION.PASSWORD');
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  submit(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.errors.set(this.validate());
    if (Object.keys(this.errors()).length > 0) {
      return;
    }
    this.loading.set(true);
    const input: LoginDTO.Request = {
      email: this.email(),
      password: this.password(),
    };
    this.authService.login(input).subscribe({
      next: (res: LoginDTO.Response) => {
        this.loading.set(false);
        this.success.set(true);
        this.authService.setTokens(res.accessToken, res.refreshToken);
        if (res.language) {
          this.languageService.setLang(res.language);
        }
        this.authService.getProfile().subscribe({
          next: () => {
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            this.authService.clearAccessToken();
            const errorMsg = this.translate.instant('LOGIN.ERROR.UNKNOWN');
            this.errors.set({ general: errorMsg });
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('[LoginCardComponent] Login error:', err);
        this.loading.set(false);
        const fieldErrors = this.mapValidationErrors(err);
        if (fieldErrors) {
          this.errors.set(fieldErrors);
          return;
        }
        let errorMsg = err.error?.message;
        if (Array.isArray(errorMsg)) {
          errorMsg = errorMsg.join('\n');
        } else if (typeof errorMsg === 'object' && errorMsg !== null) {
          errorMsg = JSON.stringify(errorMsg);
        } else if (!errorMsg) {
          errorMsg = this.translate.instant('LOGIN.ERROR.UNKNOWN');
        }
        this.errors.set({ general: String(errorMsg) });
      },
    });
  }

  toggleForgot() {
    if (this.forgotAutoCloseTimer) {
      clearTimeout(this.forgotAutoCloseTimer);
      this.forgotAutoCloseTimer = null;
    }

    const next = !this.forgotOpen();
    this.forgotOpen.set(next);
    if (!next) {
      this.cleanupForgotPanel();
    }
  }

  private cleanupForgotPanel() {
    this.forgotEmail.set('');
    this.forgotErrors.set({});
    this.forgotLoading.set(false);
    this.forgotSuccess.set(false);
    this.forgotMessage.set('');
  }

  onForgotPassword() {
    this.forgotErrors.set(this.validateForgot());
    if (Object.keys(this.forgotErrors()).length > 0) {
      return;
    }
    this.forgotLoading.set(true);
    this.forgotSuccess.set(false);
    this.forgotMessage.set('');

    this.authService.forgotPassword(this.forgotEmail()).subscribe({
      next: () => {
        this.forgotLoading.set(false);
        // SECURITY: Always show the same message regardless of email existence
        const successMsg = this.translate.instant('LOGIN.FORGOT.SUCCESS_MESSAGE');
        this.toastService.success(this.translate.instant('LOGIN.FORGOT.SUCCESS_MESSAGE'));
        this.forgotSuccess.set(true);
        this.forgotMessage.set(successMsg);

        // Auto-close panel after 3 seconds
        if (this.forgotAutoCloseTimer) {
          clearTimeout(this.forgotAutoCloseTimer);
        }
        this.forgotAutoCloseTimer = setTimeout(() => {
          this.toggleForgot();
          this.forgotAutoCloseTimer = null;
        }, 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.forgotLoading.set(false);
        // SECURITY: Show generic message for both validation errors and server errors
        console.error('[LoginCardComponent] Forgot password error:', err);
        const errorMsg = this.translate.instant('LOGIN.ERROR.UNKNOWN');
        this.toastService.error(this.translate.instant('LOGIN.ERROR.UNKNOWN'));
        this.forgotErrors.set({
          general: errorMsg,
        });
      },
    });
  }

  socialLogin(provider: string) {
    // Método mantenido solo para Apple (Google usa botón nativo)
    if (provider !== 'Apple') {
      return;
    }

    alert(this.translate.instant('LOGIN.SOCIAL.NOT_IMPLEMENTED', { provider }));
  }
}
