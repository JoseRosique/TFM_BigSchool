import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-calendar-hero',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './calendar-hero.component.html',
  styleUrl: './calendar-hero.component.scss',
})
export class CalendarHeroComponent {
  displayTimezone = input<string>('UTC');

  createClick = output<void>();

  onCreateClick(): void {
    this.createClick.emit();
  }
}
