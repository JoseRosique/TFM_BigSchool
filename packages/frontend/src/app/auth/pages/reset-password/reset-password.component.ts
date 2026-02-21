import { CommonModule } from '@angular/common';
import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  token = signal('');
  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

  form = this.fb.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(64),
          Validators.pattern(this.passwordPattern),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordsMatchValidator },
  );

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    this.token.set(token);
    if (!token) {
      this.error.set(this.translate.instant('AUTH.RESET.ERRORS.INVALID_TOKEN'));
    }
  }

  submit(): void {
    if (!this.token()) {
      this.error.set(this.translate.instant('AUTH.RESET.ERRORS.INVALID_TOKEN'));
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.form.value;
    this.loading.set(true);
    this.error.set(null);

    this.authService
      .resetPassword({
        token: this.token(),
        newPassword: newPassword as string,
        confirmPassword: confirmPassword as string,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          this.toastService.success('AUTH.RESET.SUCCESS_TOAST');
          const timeoutId = setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 1500);
          this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          let errorKey = 'AUTH.RESET.ERRORS.SUBMIT_FAILED';
          if (err.status === 400) {
            const errorCode = err.error?.message;
            if (errorCode === 'INVALID_RESET_TOKEN') {
              errorKey = 'AUTH.RESET.ERRORS.INVALID_TOKEN';
            } else if (errorCode === 'RESET_TOKEN_EXPIRED') {
              errorKey = 'AUTH.RESET.ERRORS.TOKEN_EXPIRED';
            } else if (errorCode === 'PASSWORD_MISMATCH') {
              errorKey = 'AUTH.RESET.ERRORS.PASSWORD_MISMATCH';
            }
          }

          const errorMsg = this.translate.instant(errorKey);
          this.error.set(errorMsg);
          this.toastService.error(errorKey);
          console.error('[ResetPasswordComponent] Reset error:', err);
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private passwordsMatchValidator(group: any) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!newPassword || !confirmPassword) return null;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }
}
