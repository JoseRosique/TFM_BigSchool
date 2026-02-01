import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  template: `
    @if (shouldShowHeader()) {
      <app-header></app-header>
    }
    <router-outlet></router-outlet>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
    `,
  ],
})
export class AppComponent {
  private readonly router = inject(Router);
  shouldShowHeader = () => {
    const currentUrl = this.router.url;
    const basePath = currentUrl.split('?')[0].split('#')[0];
    // Don't show header on landing, auth pages, or users-test
    const excludedRoutes = ['/', '/auth/login', '/auth/signup', '/users-test'];
    return !excludedRoutes.includes(basePath) && !basePath.startsWith('/auth');
  };
}
