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
  templateUrl: './signup-page.component.html',
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
