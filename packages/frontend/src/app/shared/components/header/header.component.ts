import {
  Component,
  inject,
  OnInit,
  signal,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

/**
 * Global Header Component
 * Displays logo, welcome message, notifications icon, and profile dropdown
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);

  @ViewChild('profileContainer') profileContainer!: ElementRef;

  userName = signal<string>('Usuario');
  userAvatar = signal<string>('/assets/avatars/avatar-1.svg');
  currentTheme = this.themeService.theme;
  isDropdownOpen = signal<boolean>(false);
  currentLang: string = 'es';
  showLangMenu = false;

  ngOnInit(): void {
    this.subscribeToUserChanges();
    this.currentLang = this.languageService.getCurrentLang();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isDropdownOpen() && this.profileContainer) {
      const clickedInside = this.profileContainer.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.closeDropdown();
      }
    }
  }

  private subscribeToUserChanges(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.userName.set(user.name || user.email);
        this.userAvatar.set(user.avatarUrl || '/assets/avatars/avatar-1.svg');
      } else {
        this.userName.set('Usuario');
        this.userAvatar.set('/assets/avatars/avatar-1.svg');
      }
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update((value) => !value);
    // Cerrar language menu cuando se abre el dropdown del perfil
    if (this.isDropdownOpen()) {
      this.closeLangMenu();
    }
  }

  toggleTheme(): void {
    const current = this.currentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.themeService.setTheme(next);
    this.authService.updateProfile({ theme: next }).subscribe({
      error: () => {
        this.themeService.setTheme(current);
      },
    });
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAccessToken();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.authService.clearAccessToken();
        this.router.navigate(['/auth/login']);
      },
    });
  }

  onNotificationsClick(): void {
    // Placeholder for future notifications functionality
  }

  setLang(lang: string): void {
    this.currentLang = lang;
    this.languageService.setLang(lang);
    this.authService.updateLanguage(lang).subscribe({
      error: () => {},
    });
  }

  toggleLangMenu(): void {
    this.showLangMenu = !this.showLangMenu;
    // Cerrar dropdown del perfil cuando se abre el language menu
    if (this.showLangMenu) {
      this.closeDropdown();
    }
  }

  closeLangMenu(): void {
    this.showLangMenu = false;
  }
}
