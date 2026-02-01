import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimatedBackgroundComponent } from '../animated-background/animated-background.component';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { LanguageService } from '../shared/services/language.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, AnimatedBackgroundComponent, TranslateModule],
  styleUrls: ['./landing.component.scss'],
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit, OnDestroy {
  private languageService = inject(LanguageService);
  currentLang = this.languageService.getCurrentLang();
  showLangMenu = false;
  private langSub: any;
  private cdr = inject(ChangeDetectorRef);

  constructor(private router: Router) {}

  ngOnInit() {
    this.languageService.initLang();
    this.currentLang = this.languageService.getCurrentLang();
    this.langSub = this.languageService.langChanges().subscribe((lang) => {
      this.currentLang = lang;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.langSub) this.langSub.unsubscribe();
  }

  setLang(lang: string) {
    this.languageService.setLang(lang);
  }

  goToSignup() {
    this.router.navigate(['/auth/signup']);
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
