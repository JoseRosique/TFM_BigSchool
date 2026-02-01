import { Component, signal, inject } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../shared/services/auth.service';
import { LoginDTO } from '@meetwithfriends/shared';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [TranslateModule],
  styleUrls: ['./login-card.component.scss'],
  templateUrl: './login-card.component.html',
})
export class LoginCardComponent {
  private translate = inject(TranslateService);
  private authService = inject(AuthService);

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

  async submit() {
    this.errors.set(this.validate());
    if (Object.keys(this.errors()).length > 0) return;
    this.loading.set(true);
    const input: LoginDTO.Request = {
      email: this.email(),
      password: this.password(),
    };
    this.authService.login(input).subscribe({
      next: (res: { accessToken: string }) => {
        this.loading.set(false);
        this.success.set(true);
        this.authService.setAccessToken(res.accessToken);
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        if (err?.error?.message) {
          this.errors.set({ general: err.error.message });
        } else {
          this.errors.set({ general: this.translate.instant('LOGIN.ERROR.UNKNOWN') });
        }
      },
    });
  }

  socialLogin(provider: string) {
    alert(this.translate.instant('LOGIN.SOCIAL.NOT_IMPLEMENTED', { provider }));
  }
}
