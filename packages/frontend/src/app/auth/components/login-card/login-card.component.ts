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
        this.authService.setAccessToken(res.accessToken);
        if (res.language) {
          this.languageService.setLang(res.language);
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        console.error('[LoginCardComponent] Login error:', err);
        this.loading.set(false);
        const errorMsg = err.error?.message || this.translate.instant('LOGIN.ERROR.UNKNOWN');
        this.errors.set({ general: errorMsg });
      },
    });
  }

  socialLogin(provider: string) {
    alert(this.translate.instant('LOGIN.SOCIAL.NOT_IMPLEMENTED', { provider }));
  }
}
