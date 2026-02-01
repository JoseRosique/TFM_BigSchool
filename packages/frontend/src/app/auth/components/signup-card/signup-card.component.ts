import { Component, signal, inject } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../shared/services/auth.service';
import { RegisterDTO } from '@meetwithfriends/shared';

@Component({
  selector: 'app-signup-card',
  standalone: true,
  imports: [TranslateModule],
  styleUrls: ['./signup-card.component.scss'],
  templateUrl: './signup-card.component.html',
})
export class SignupCardComponent {
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  // Signals for form state
  name = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  birthdate = signal('');

  // Validation and UI state
  errors = signal<{ [key: string]: string }>({});
  touched = signal<{ [key: string]: boolean }>({});
  loading = signal(false);
  success = signal(false);

  // Simple validators (replace with more robust ones as needed)
  validate() {
    const errors: { [key: string]: string } = {};
    const name = this.name();
    const email = this.email();
    const password = this.password();
    const confirmPassword = this.confirmPassword();
    if (!name) errors['name'] = this.translate.instant('SIGNUP.VALIDATION.NAME');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      errors['email'] = this.translate.instant('SIGNUP.VALIDATION.EMAIL');
    if (!password || password.length < 8)
      errors['password'] = this.translate.instant('SIGNUP.VALIDATION.PASSWORD');
    if (password !== confirmPassword)
      errors['confirmPassword'] = this.translate.instant('SIGNUP.VALIDATION.CONFIRM_PASSWORD');
    return errors;
  }

  onBlur(field: string) {
    this.touched.update((t) => ({ ...t, [field]: true }));
    this.errors.set(this.validate());
  }

  onInput() {
    this.errors.set(this.validate());
  }

  async submit() {
    this.touched.set({ name: true, email: true, password: true, confirmPassword: true });
    const errors = this.validate();
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) return;
    this.loading.set(true);
    const input: RegisterDTO.Request = {
      name: this.name(),
      email: this.email(),
      password: this.password(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
    this.authService.register(input).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        if (err?.error?.message) {
          this.errors.set({ general: err.error.message });
        } else {
          this.errors.set({ general: this.translate.instant('SIGNUP.ERROR.UNKNOWN') });
        }
      },
    });
  }

  socialSignup(provider: string) {
    // Placeholder for social signup logic
    alert(this.translate.instant('SIGNUP.SOCIAL.NOT_IMPLEMENTED', { provider }));
  }
}
