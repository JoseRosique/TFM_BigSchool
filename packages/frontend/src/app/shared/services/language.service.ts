import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly LANG_KEY = 'selectedLang';
  private lang$ = new BehaviorSubject<string>(this.getCurrentLang());

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['es', 'en']);
    this.translate.setDefaultLang('es');
    this.initLang();
  }

  getCurrentLang(): string {
    return (
      localStorage.getItem(this.LANG_KEY) ||
      this.translate.currentLang ||
      this.translate.getDefaultLang() ||
      'es'
    );
  }

  setLang(lang: string) {
    localStorage.setItem(this.LANG_KEY, lang);
    this.translate.use(lang).subscribe({
      next: () => this.lang$.next(lang),
      error: () => this.lang$.next(lang),
    });
  }

  initLang() {
    const lang = this.getCurrentLang();
    this.translate.use(lang).subscribe({
      next: () => this.lang$.next(lang),
      error: () => this.lang$.next(lang),
    });
  }

  langChanges() {
    return this.lang$.asObservable();
  }
}
