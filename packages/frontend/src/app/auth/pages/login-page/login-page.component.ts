import { Component, inject, OnInit } from '@angular/core';
import { LanguageService } from '../../../shared/services/language.service';
import { CommonModule } from '@angular/common';
import { LoginCardComponent } from '../../components/login-card/login-card.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginCardComponent],
  template: `
    <div class="login-page-bg">
      <app-login-card></app-login-card>
    </div>
  `,
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent implements OnInit {
  private languageService = inject(LanguageService);
  ngOnInit() {
    this.languageService.initLang();
  }
}
