import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  buildMonthGrid,
  formatDateInputValue,
  formatMonthLabel,
  formatWeekdayLabel,
  getMonthStart,
  parseDateInputValue,
  addMonths,
  buildTimeOptions,
  buildMonthLabels,
} from '../date-time-utils';

@Component({
  selector: 'app-date-time-range-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './date-time-range-picker.component.html',
  styleUrl: './date-time-range-picker.component.scss',
})
export class DateTimeRangePickerComponent {
  private readonly translate = inject(TranslateService);

  date = input<string | null>(null);
  startTime = input<string | null>(null);
  endTime = input<string | null>(null);
  min = input<string | null>(null);
  max = input<string | null>(null);
  timeZone = input<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  yearStart = input<number>(1900);
  yearEnd = input<number>(new Date().getFullYear() + 5);
  stepMinutes = input<number>(15);
  disabled = input<boolean>(false);

  dateChange = output<string | null>();
  startTimeChange = output<string | null>();
  endTimeChange = output<string | null>();

  @ViewChild('popover') popover?: ElementRef<HTMLDivElement>;

  isOpen = signal(false);
  viewDate = signal<Date>(getMonthStart(new Date()));

  locale = computed(() => this.translate.currentLang || 'en');
  selectedDate = computed(() => (this.date() ? parseDateInputValue(this.date()!) : null));

  years = computed(() => {
    const start = this.yearStart();
    const end = this.yearEnd();
    const list: number[] = [];
    for (let year = end; year >= start; year -= 1) {
      list.push(year);
    }
    return list;
  });

  monthLabel = computed(() => formatMonthLabel(this.viewDate(), this.locale(), this.timeZone()));

  monthLabels = computed(() => buildMonthLabels(this.locale(), this.timeZone()));

  weekdays = computed(() => {
    const start = getMonthStart(this.viewDate());
    const labels: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() - ((start.getDay() + 6) % 7) + i);
      labels.push(formatWeekdayLabel(date, this.locale(), this.timeZone()));
    }
    return labels;
  });

  grid = computed(() => buildMonthGrid(this.viewDate(), this.timeZone(), this.locale()));
  timeOptions = computed(() => buildTimeOptions(this.stepMinutes()));

  private readonly syncViewDate = effect(() => {
    const selected = this.selectedDate();
    if (selected) {
      this.viewDate.set(getMonthStart(selected));
    }
  });

  toggle(): void {
    if (this.disabled()) return;
    this.isOpen.update((open) => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }

  selectDate(date: Date): void {
    const value = formatDateInputValue(date);
    if (this.isDisabled(value)) return;
    this.dateChange.emit(value);
  }

  goPrevMonth(): void {
    this.viewDate.set(getMonthStart(addMonths(this.viewDate(), -1)));
  }

  goNextMonth(): void {
    this.viewDate.set(getMonthStart(addMonths(this.viewDate(), 1)));
  }

  setMonth(month: string): void {
    const next = new Date(this.viewDate());
    next.setMonth(Number(month));
    this.viewDate.set(getMonthStart(next));
  }

  onMonthChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    this.setMonth(target.value);
  }

  setYear(year: string): void {
    const next = new Date(this.viewDate());
    next.setFullYear(Number(year));
    this.viewDate.set(getMonthStart(next));
  }

  onYearChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    this.setYear(target.value);
  }

  clear(): void {
    this.dateChange.emit(null);
  }

  updateStartTime(value: string): void {
    this.startTimeChange.emit(value || null);
  }

  onStartTimeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    this.updateStartTime(target.value);
  }

  updateEndTime(value: string): void {
    this.endTimeChange.emit(value || null);
  }

  onEndTimeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    this.updateEndTime(target.value);
  }

  isDisabled(dayKey: string): boolean {
    const min = this.min();
    const max = this.max();
    if (min && dayKey < min) return true;
    if (max && dayKey > max) return true;
    return false;
  }

  displayValue(): string {
    const selected = this.selectedDate();
    if (!selected) return '';
    const dateLabel = new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'medium',
      timeZone: this.timeZone(),
    }).format(selected);
    const start = this.startTime() || '--:--';
    const end = this.endTime() || '--:--';
    return `${dateLabel} · ${start} - ${end}`;
  }

  selectToday(): void {
    this.selectDate(new Date());
  }

  onDayKeydown(event: KeyboardEvent, index: number): void {
    const grid = this.grid();
    if (!grid.length) return;
    let nextIndex = index;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = Math.min(grid.length - 1, index + 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(grid.length - 1, index + 7);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(0, index - 7);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDate(grid[index].date);
        return;
      case 'Escape':
        this.close();
        return;
      default:
        return;
    }

    event.preventDefault();
    const buttons =
      this.popover?.nativeElement.querySelectorAll<HTMLButtonElement>('[data-day-button]');
    const target = buttons?.[nextIndex];
    target?.focus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    if (!this.popover) return;
    const target = event.target as Node;
    if (!this.popover.nativeElement.contains(target)) {
      this.close();
    }
  }
}
