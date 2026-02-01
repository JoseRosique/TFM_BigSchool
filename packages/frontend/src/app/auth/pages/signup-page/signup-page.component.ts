import { Component, inject, OnInit } from '@angular/core';
import { LanguageService } from '../../../shared/services/language.service';
import { CommonModule } from '@angular/common';
import { SignupCardComponent } from '../../components/signup-card/signup-card.component';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, SignupCardComponent, TranslateModule],
  template: `
    <div class="signup-page-bg">
      <nav class="navbar">
        <div class="navbar__left">
          <button class="navbar__logo-btn" type="button" (click)="goHome()" aria-label="Go to home">
            <span class="material-symbols-outlined navbar__logo">diversity_3</span>
            <span class="navbar__brand">{{ 'GLOBAL.APP_NAME' | translate }}</span>
          </button>
        </div>
      </nav>
      <app-signup-card></app-signup-card>
    </div>
  `,
  styleUrls: ['./signup-page.component.scss'],
})
export class SignupPageComponent implements OnInit {
  private languageService = inject(LanguageService);
  private router = inject(Router);

  ngOnInit() {
    this.languageService.initLang();
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
