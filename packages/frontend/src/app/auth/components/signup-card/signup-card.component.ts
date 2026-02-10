import { Component, signal, inject } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { LanguageService } from '../../../shared/services/language.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { ToastService } from '../../../shared/services/toast.service';
import { RegisterDTO } from '@meetwithfriends/shared';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { DateOnlyPickerComponent } from '../../../shared/components/date-time-picker/date-only-picker.component';
import { formatDateInputValue } from '../../../shared/components/date-time-picker/date-time-utils';

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
  // Signals for form state
  name = signal('');
  email = signal('');
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

  submit(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.touched.set({ name: true, email: true, password: true, confirmPassword: true });
    const errors = this.validate();
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.loading.set(true);
    const input: RegisterDTO.Request = {
      name: this.name(),
      email: this.email(),
      password: this.password(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      language: this.languageService.getCurrentLang(),
    };
    this.authService.register(input).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set(true);
        this.authService.setAccessToken(response.accessToken);
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
        const errorMsg = err.error?.message || this.translate.instant('SIGNUP.ERROR.UNKNOWN');
        this.errors.set({ general: errorMsg });
      },
    });
  }

  socialSignup(provider: string) {
    // Placeholder for social signup logic
    alert(this.translate.instant('SIGNUP.SOCIAL.NOT_IMPLEMENTED', { provider }));
  }
}
