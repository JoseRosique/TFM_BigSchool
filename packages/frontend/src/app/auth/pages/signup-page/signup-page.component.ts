import { Component, inject, OnInit } from '@angular/core';
import { LanguageService } from '../../../shared/services/language.service';
import { CommonModule } from '@angular/common';
import { SignupCardComponent } from '../../components/signup-card/signup-card.component';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, SignupCardComponent],
  template: `
    <div class="signup-page-bg">
      <app-signup-card></app-signup-card>
    </div>
  `,
  styleUrls: ['./signup-page.component.scss'],
})
export class SignupPageComponent implements OnInit {
  private languageService = inject(LanguageService);
  ngOnInit() {
    this.languageService.initLang();
  }
}
