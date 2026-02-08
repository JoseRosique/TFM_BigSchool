import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../shared/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { User } from '@meetwithfriends/shared';
import { Router } from '@angular/router';
import { AvatarSelectorModalComponent } from '../../shared/components/avatar-selector-modal/avatar-selector-modal.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    AvatarSelectorModalComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly toastService = inject(ToastService);

  user = signal<User | null>(null);
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  isSaving = signal(false);
  isChangingPassword = signal(false);
  showAvatarModal = signal(false);
  showPasswordModal = signal(false);
  @ViewChild('passwordModalRef') passwordModalRef?: ElementRef<HTMLDivElement>;

  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

  timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'America/New_York' },
    { value: 'Europe/London', label: 'Europe/London' },
    { value: 'Europe/Madrid', label: 'Europe/Madrid' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney' },
  ];

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    const currentUser = this.authService.currentUser$.value;
    if (currentUser) {
      this.user.set(currentUser);
      this.initializeForm();
      return;
    }

    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user.set(profile);
        this.initializeForm();
      },
      error: () => {
        this.authService.clearAccessToken();
        this.router.navigate(['/auth/login']);
      },
    });
  }

  initializeForm(): void {
    const u = this.user();
    this.profileForm = this.fb.group({
      name: [u?.name || '', Validators.required],
      email: [u?.email || '', [Validators.required, Validators.email]],
      location: [u?.location || ''],
      timezone: [u?.timezone || 'UTC'],
      emailNotifications: [u ? (u as any).emailNotifications : true],
      pushNotifications: [u ? (u as any).pushNotifications : true],
      twoFactorEnabled: [u ? (u as any).twoFactorEnabled : false],
    });
  }

  saveChanges(): void {
    if (!this.profileForm.valid) return;

    this.isSaving.set(true);

    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: (updatedUser) => {
        this.user.set(updatedUser);
        this.isSaving.set(false);
        this.toastService.success('PROFILE.SAVE_SUCCESS');
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('PROFILE.SAVE_ERROR');
      },
    });
  }

  openPasswordModal(): void {
    this.initPasswordForm();
    this.showPasswordModal.set(true);
    setTimeout(() => {
      const focusable = this.getPasswordModalFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        this.passwordModalRef?.nativeElement.focus();
      }
    }, 0);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
    this.passwordForm.reset();
  }

  handlePasswordModalKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusable = this.getPasswordModalFocusable();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      last.focus();
      event.preventDefault();
      return;
    }

    if (!event.shiftKey && active === last) {
      first.focus();
      event.preventDefault();
    }
  }

  private getPasswordModalFocusable(): HTMLElement[] {
    const modal = this.passwordModalRef?.nativeElement;
    if (!modal) return [];

    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    return Array.from(modal.querySelectorAll<HTMLElement>(selectors.join(',')));
  }

  private initPasswordForm(): void {
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: [
          '',
          [Validators.required, Validators.minLength(8), Validators.pattern(this.passwordPattern)],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatchValidator },
    );
  }

  private passwordsMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!newPassword || !confirmPassword) return null;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  changePassword(): void {
    if (!this.passwordForm.valid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isChangingPassword.set(true);
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    this.authService.changePassword({ currentPassword, newPassword, confirmPassword }).subscribe({
      next: (response) => {
        this.authService.setAccessToken(response.accessToken);
        this.authService.getProfile().subscribe({
          next: (user) => this.user.set(user),
          error: (error) => {
            console.error('Failed to refresh profile after password change', error);
          },
        });
        this.isChangingPassword.set(false);
        this.toastService.success('PROFILE.PASSWORD_UPDATED');
        this.closePasswordModal();
      },
      error: (error) => {
        this.isChangingPassword.set(false);
        const message = Array.isArray(error?.error?.message)
          ? error.error.message[0]
          : error?.error?.message;

        if (message === 'PASSWORD_INVALID_CURRENT') {
          this.passwordForm.get('currentPassword')?.setErrors({ invalid: true });
          this.passwordForm.get('currentPassword')?.markAsTouched();
          return;
        }

        if (message === 'PASSWORD_REUSE') {
          this.passwordForm.get('newPassword')?.setErrors({ reuse: true });
          this.passwordForm.get('newPassword')?.markAsTouched();
          return;
        }

        if (message === 'PASSWORD_MISMATCH') {
          this.passwordForm.setErrors({ passwordMismatch: true });
          this.passwordForm.get('confirmPassword')?.markAsTouched();
          return;
        }

        if (message === 'PASSWORD_WEAK') {
          this.passwordForm.get('newPassword')?.setErrors({ weak: true });
          this.passwordForm.get('newPassword')?.markAsTouched();
          return;
        }

        if (message === 'PASSWORD_REQUIRED') {
          if (!this.passwordForm.get('currentPassword')?.value) {
            this.passwordForm.get('currentPassword')?.setErrors({ required: true });
          }
          if (!this.passwordForm.get('newPassword')?.value) {
            this.passwordForm.get('newPassword')?.setErrors({ required: true });
          }
          if (!this.passwordForm.get('confirmPassword')?.value) {
            this.passwordForm.get('confirmPassword')?.setErrors({ required: true });
          }
          this.passwordForm.markAllAsTouched();
          return;
        }

        this.toastService.error('PROFILE.PASSWORD_UPDATE_ERROR');
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAccessToken();
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout failed', error);
        this.authService.clearAccessToken();
        this.router.navigate(['/auth/login']);
      },
    });
  }

  openAvatarModal(): void {
    this.showAvatarModal.set(true);
  }

  closeAvatarModal(): void {
    this.showAvatarModal.set(false);
  }

  saveAvatar(avatarUrl: string): void {
    if (avatarUrl === this.getUserAvatar()) {
      this.closeAvatarModal();
      return;
    }
    this.authService.updateProfile({ avatarUrl }).subscribe({
      next: (updatedUser) => {
        this.user.set(updatedUser);
        this.closeAvatarModal();
        this.toastService.success('PROFILE.AVATAR_UPDATED');
      },
      error: () => {
        this.toastService.error('PROFILE.SAVE_ERROR');
      },
    });
  }

  getUserAvatar(): string {
    return this.user()?.avatarUrl || '/assets/avatars/avatar-1.svg';
  }

  hasPasswordChanged(): boolean {
    return !!(this.user() as any)?.passwordChangedAt;
  }

  passwordChangedAgo(): string {
    const dateValue = (this.user() as any)?.passwordChangedAt;
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    const now = Date.now();
    const diffMs = date.getTime() - now;
    const absMs = Math.abs(diffMs);

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    let value = 0;
    let unit: Intl.RelativeTimeFormatUnit = 'day';

    if (absMs >= year) {
      unit = 'year';
      value = Math.round(diffMs / year);
    } else if (absMs >= month) {
      unit = 'month';
      value = Math.round(diffMs / month);
    } else if (absMs >= week) {
      unit = 'week';
      value = Math.round(diffMs / week);
    } else if (absMs >= day) {
      unit = 'day';
      value = Math.round(diffMs / day);
    } else if (absMs >= hour) {
      unit = 'hour';
      value = Math.round(diffMs / hour);
    } else {
      unit = 'minute';
      value = Math.round(diffMs / minute) || -1;
    }

    const lang = this.translate.currentLang || this.translate.defaultLang || 'en';
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    return rtf.format(value, unit);
  }
}
