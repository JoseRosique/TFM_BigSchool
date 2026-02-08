import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from './auth.service';

export type ThemePreference = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);
  private readonly themeSignal = signal<ThemePreference>('light');

  theme = this.themeSignal.asReadonly();

  constructor() {
    this.applyTheme('light');
    this.authService.currentUser$.subscribe((user) => {
      const nextTheme = (user?.theme as ThemePreference) || 'light';
      if (nextTheme !== this.themeSignal()) {
        this.setTheme(nextTheme);
      }
    });
  }

  setTheme(theme: ThemePreference): void {
    this.themeSignal.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: ThemePreference): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }
}
