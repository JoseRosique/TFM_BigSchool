import { Component, signal, inject } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { LanguageService } from '../../../shared/services/language.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { ToastService } from '../../../shared/services/toast.service';
import { RegisterDTO } from '@meetwithfriends/shared';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DateOnlyPickerComponent } from '../../../shared/components/date-time-picker/date-only-picker/date-only-picker.component';
import { formatDateInputValue } from '../../../shared/components/date-time-picker/date-time-utils';
import { environment } from '../../../../environments/environment';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-signup-card',
  standalone: true,
  imports: [TranslateModule, FormsModule, DateOnlyPickerComponent],
  styleUrls: ['./signup-card.component.scss'],
  templateUrl: './signup-card.component.html',
})
export class SignupCardComponent {
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  // Signals for form state
  name = signal('');
  email = signal('');
  nickname = signal('');
  password = signal('');
  confirmPassword = signal('');
  birthdate = signal('');
  readonly maxBirthdate = formatDateInputValue(new Date());
  readonly birthdateYearStart = 1900;
  readonly birthdateYearEnd = new Date().getFullYear();

  // Validation and UI state
  errors = signal<{ [key: string]: string }>({});
  touched = signal<{ [key: string]: boolean }>({});
  loading = signal(false);
  success = signal(false);
  nicknameChecking = signal(false);
  nicknameAvailable = signal<boolean | null>(null);

  // Simple validators (replace with more robust ones as needed)
  validate() {
    const errors: { [key: string]: string } = {};
    const name = this.name();
    const email = this.email();
    const nickname = this.nickname();
    const password = this.password();
    const confirmPassword = this.confirmPassword();

    if (!name) errors['name'] = this.translate.instant('SIGNUP.VALIDATION.NAME');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      errors['email'] = this.translate.instant('SIGNUP.VALIDATION.EMAIL');

    // Nickname short-circuit: required/length check first
    if (!nickname || nickname.length < 3 || nickname.length > 100) {
      errors['nickname'] = this.translate.instant('SIGNUP.VALIDATION.NICKNAME');
    } else {
      // Only check format if length is valid
      if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
        errors['nickname'] = this.translate.instant('SIGNUP.VALIDATION.NICKNAME_FORMAT');
      } else if (this.nicknameAvailable() === false) {
        // Only check availability if format is valid
        errors['nickname'] = this.translate.instant('SIGNUP.VALIDATION.NICKNAME_TAKEN');
      }
    }

    if (!password || password.length < 8)
      errors['password'] = this.translate.instant('SIGNUP.VALIDATION.PASSWORD');
    if (password !== confirmPassword)
      errors['confirmPassword'] = this.translate.instant('SIGNUP.VALIDATION.CONFIRM_PASSWORD');

    return errors;
  }

  onBlur(field: string) {
    this.touched.update((t) => ({ ...t, [field]: true }));
    if (field === 'nickname') {
      this.checkNicknameAvailability();
    }
    this.errors.set(this.validate());
  }

  checkNicknameAvailability() {
    const nickname = this.nickname().trim().toLowerCase();
    if (!nickname || nickname.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(nickname)) {
      this.nicknameAvailable.set(null);
      return;
    }

    this.nicknameChecking.set(true);
    this.http
      .get<{ available: boolean }>(`${this.apiUrl}/auth/check-nickname/${nickname}`)
      .pipe(timeout(5000))
      .subscribe({
        next: (response) => {
          this.nicknameChecking.set(false);
          this.nicknameAvailable.set(response.available);
          this.errors.set(this.validate());
        },
        error: (err) => {
          // Error de red: reset a null (no bloquea el formulario)
          console.warn('Verificación de nickname fallida:', err);
          this.nicknameChecking.set(false);
          this.nicknameAvailable.set(null); // Permite envío a pesar del error de red
          // No establece error - el backend manejará validación de duplicate nickname
        },
      });
  }

  onInput() {
    this.errors.set(this.validate());
  }

  private mapValidationErrors(err: HttpErrorResponse): { [key: string]: string } | null {
    if (err.status !== 400 || !Array.isArray(err.error?.message)) {
      return null;
    }

    const errors: { [key: string]: string } = {};
    const messages = Array.isArray(err.error.message) ? err.error.message : [err.error.message];

    for (const message of messages) {
      const normalized = String(message).toLowerCase();
      if (normalized.includes('name')) {
        errors['name'] = this.translate.instant('SIGNUP.VALIDATION.NAME');
      }
      if (normalized.includes('email')) {
        errors['email'] = this.translate.instant('SIGNUP.VALIDATION.EMAIL');
      }
      if (normalized.includes('confirm')) {
        errors['confirmPassword'] = this.translate.instant('SIGNUP.VALIDATION.CONFIRM_PASSWORD');
      } else if (normalized.includes('password')) {
        errors['password'] = this.translate.instant('SIGNUP.VALIDATION.PASSWORD');
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  submit(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.touched.set({
      name: true,
      email: true,
      nickname: true,
      password: true,
      confirmPassword: true,
    });
    const errors = this.validate();
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.loading.set(true);
    const input: RegisterDTO.Request = {
      name: this.name(),
      email: this.email(),
      nickname: this.nickname(),
      password: this.password(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      language: this.languageService.getCurrentLang(),
    };
    this.authService.register(input).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set(true);
        this.authService.setTokens(response.accessToken, response.refreshToken);
        this.languageService.setLang(response.language || input.language || 'es');
        this.themeService.setTheme('dark');
        this.toastService.success('SIGNUP.SUCCESS');
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
        console.error('[SignupCardComponent] Registration error:', err);
        this.loading.set(false);
        const fieldErrors = this.mapValidationErrors(err);
        if (fieldErrors) {
          this.errors.set(fieldErrors);
          return;
        }
        let errorMsg = err.error?.message;
        if (Array.isArray(errorMsg)) {
          errorMsg = errorMsg.join(', ');
        } else if (typeof errorMsg === 'object' && errorMsg !== null) {
          errorMsg = JSON.stringify(errorMsg);
        } else if (!errorMsg) {
          errorMsg = this.translate.instant('SIGNUP.ERROR.UNKNOWN');
        }
        this.errors.set({ general: String(errorMsg) });
      },
    });
  }

  socialSignup(provider: string) {
    // Placeholder for social signup logic
    alert(this.translate.instant('SIGNUP.SOCIAL.NOT_IMPLEMENTED', { provider }));
  }
}
