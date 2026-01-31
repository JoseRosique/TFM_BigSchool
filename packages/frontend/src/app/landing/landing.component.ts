import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimatedBackgroundComponent } from '../animated-background/animated-background.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, AnimatedBackgroundComponent, TranslateModule],
  styleUrls: ['./landing.component.scss'],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  private translate = inject(TranslateService);

  currentLang = this.translate.currentLang || 'es';
  showLangMenu = false;

  constructor() {
    // Esto asegura que el servicio sepa qué archivo cargar
    this.translate.use(this.currentLang);
  }

  setLang(lang: string) {
    this.translate.use(lang);
    this.currentLang = lang;
  }
  // ...existing code...
}
