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
  buildMonthLabels,
  formatDateInputDisplay,
} from '../date-time-utils';

@Component({
  selector: 'app-date-only-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './date-only-picker.component.html',
  styleUrl: './date-only-picker.component.scss',
})
export class DateOnlyPickerComponent {
  showYearDropdown = false;
  private readonly translate = inject(TranslateService);

  value = input<string | null>(null);
  min = input<string | null>(null);
  max = input<string | null>(null);
  placeholder = input<string>('');
  timeZone = input<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  yearStart = input<number>(1900);
  yearEnd = input<number>(new Date().getFullYear());
  disabled = input<boolean>(false);
  embedded = input<boolean>(false);
  readonly = input<boolean>(false);

  valueChange = output<string | null>();
  openChange = output<boolean>();

  @ViewChild('popover') popover?: ElementRef<HTMLDivElement>;

  isOpen = signal(false);
  viewDate = signal<Date>(getMonthStart(new Date()));
  focusedKey = signal<string | null>(null);

  years = computed(() => {
    const start = this.yearStart();
    const end = this.yearEnd();
    const list: number[] = [];
    for (let year = end; year >= start; year -= 1) {
      list.push(year);
    }
    return list;
  });

  locale = computed(() => this.translate.currentLang || 'en');

  selectedDate = computed(() => {
    const value = this.value();
    return value ? parseDateInputValue(value) : null;
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

  private readonly syncViewDate = effect(() => {
    const selected = this.selectedDate();
    if (selected) {
      this.viewDate.set(getMonthStart(selected));
    }
  });

  toggle(): void {
    if (this.disabled() || this.readonly()) return;
    this.isOpen.update((open) => !open);
    this.openChange.emit(this.isOpen());
  }

  close(): void {
    this.isOpen.set(false);
    this.openChange.emit(false);
  }

  selectDate(date: Date): void {
    const value = formatDateInputValue(date);
    if (this.isDisabled(value)) return;
    this.valueChange.emit(value);
    this.focusedKey.set(null);
    this.close();
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
    this.valueChange.emit(null);
    this.close();
  }

  selectToday(): void {
    this.selectDate(new Date());
  }

  isSelected(dayKey: string): boolean {
    return dayKey === this.value();
  }

  isDisabled(dayKey: string): boolean {
    const min = this.min();
    const max = this.max();
    if (min && dayKey < min) return true;
    if (max && dayKey > max) return true;
    return false;
  }

  displayValue(): string {
    const value = this.value();
    if (!value) return '';
    return formatDateInputDisplay(value, this.locale());
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
    this.focusedKey.set(grid[nextIndex].key);
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
