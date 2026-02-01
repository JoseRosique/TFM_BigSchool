import { Component, inject, OnInit } from '@angular/core';
import { LanguageService } from '../../../shared/services/language.service';
import { CommonModule } from '@angular/common';
import { LoginCardComponent } from '../../components/login-card/login-card.component';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginCardComponent, TranslateModule],
  template: `
    <div class="login-page-bg">
      <nav class="navbar">
        <div class="navbar__left">
          <button class="navbar__logo-btn" type="button" (click)="goHome()" aria-label="Go to home">
            <span class="material-symbols-outlined navbar__logo">diversity_3</span>
            <span class="navbar__brand">{{ 'GLOBAL.APP_NAME' | translate }}</span>
          </button>
        </div>
      </nav>
      <app-login-card></app-login-card>
    </div>
  `,
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent implements OnInit {
  private languageService = inject(LanguageService);
  private router = inject(Router);

  ngOnInit() {
    this.languageService.initLang();
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
