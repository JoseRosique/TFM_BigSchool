import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-calendar-toolbar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './calendar-toolbar.component.html',
  styleUrl: './calendar-toolbar.component.scss',
})
export class CalendarToolbarComponent {
  viewMode = input<'mine' | 'explore'>('mine');
  monthLabel = input<string>('');

  viewModeChange = output<'mine' | 'explore'>();
  prevMonth = output<void>();
  nextMonth = output<void>();
  today = output<void>();

  setViewMode(mode: 'mine' | 'explore'): void {
    this.viewModeChange.emit(mode);
  }

  goPrev(): void {
    this.prevMonth.emit();
  }

  goNext(): void {
    this.nextMonth.emit();
  }

  goToday(): void {
    this.today.emit();
  }
}
