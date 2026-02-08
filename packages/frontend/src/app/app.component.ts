import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ToastContainerComponent } from './shared/components/toast/toast.component';
import { filter } from 'rxjs';
import { AuthService } from './shared/services/auth.service';
import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  readonly guardLoading = this.authService.guardLoading;

  ngOnInit(): void {
    if (this.authService.isAuthenticated() && !this.authService.currentUser$.value) {
      this.authService.getProfile().subscribe({
        error: () => {
          this.authService.clearAccessToken();
          this.router.navigate(['/auth/login']);
        },
      });
    }
  }
  shouldShowHeader = () => {
    const currentUrl = this.router.url;
    const basePath = currentUrl.split('?')[0].split('#')[0];
    // Don't show header on landing, auth pages, or users-test
    const excludedRoutes = ['/', '/auth/login', '/auth/signup', '/users-test'];
    return !excludedRoutes.includes(basePath) && !basePath.startsWith('/auth');
  };
}
