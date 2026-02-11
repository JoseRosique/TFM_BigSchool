import { Component, signal, inject } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { LanguageService } from '../../../shared/services/language.service';
import { LoginDTO } from '@meetwithfriends/shared';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [TranslateModule, FormsModule],
  styleUrls: ['./login-card.component.scss'],
  templateUrl: './login-card.component.html',
})
export class LoginCardComponent {
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  email = signal('');
  password = signal('');
  errors = signal<{ [key: string]: string }>({});
  loading = signal(false);
  success = signal(false);

  validate() {
    const errors: { [key: string]: string } = {};
    const email = this.email();
    const password = this.password();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      errors['email'] = this.translate.instant('LOGIN.VALIDATION.EMAIL');
    if (!password) errors['password'] = this.translate.instant('LOGIN.VALIDATION.PASSWORD');
    return errors;
  }

  onInput() {
    this.errors.set(this.validate());
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

  socialLogin(provider: string) {
    alert(this.translate.instant('LOGIN.SOCIAL.NOT_IMPLEMENTED', { provider }));
  }
}
