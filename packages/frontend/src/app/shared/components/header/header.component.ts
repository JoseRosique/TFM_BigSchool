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
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

/**
 * Global Header Component
 * Displays logo, welcome message, notifications icon, and profile dropdown
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);

  @ViewChild('profileContainer') profileContainer!: ElementRef;

  userName = signal<string>('Usuario');
  isDropdownOpen = signal<boolean>(false);
  currentLang: string = 'es';
  showLangMenu = false;

  ngOnInit(): void {
    this.loadUserProfile();
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

  private loadUserProfile(): void {
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.userName.set(user.name || user.email);
      },
      error: (error) => {
        console.error('[HeaderComponent] Error loading profile:', error);
        // Fallback to default
        this.userName.set('Usuario');
      },
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update((value) => !value);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.closeDropdown();
    this.authService.clearAccessToken();
    this.router.navigate(['/auth/login']);
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
  }

  closeLangMenu(): void {
    this.showLangMenu = false;
  }
}
