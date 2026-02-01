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
  templateUrl: './login-page.component.html',
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
