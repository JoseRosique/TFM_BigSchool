import { Component, Input, ViewChild, ElementRef, signal, effect } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-custom-timepicker',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './custom-timepicker.component.html',
  styleUrl: './custom-timepicker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: CustomTimepickerComponent,
      multi: true,
    },
  ],
})
export class CustomTimepickerComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Input() placeholder = 'Select time';
  @Input() ariaLabel = 'Time picker';

  @ViewChild('hoursContainer') hoursContainer!: ElementRef;
  @ViewChild('minutesContainer') minutesContainer!: ElementRef;

  currentHour = signal<string>('00');
  currentMinute = signal<string>('00');
  isOpen = signal(false);

  hours: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  minutes: string[] = Array.from({ length: 4 }, (_, i) => String(i * 15).padStart(2, '0'));

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  // Use effect as a field initializer to track time changes
  private timeEffect = effect(() => {
    const hour = this.currentHour();
    const minute = this.currentMinute();
    this.emitValue(`${hour}:${minute}`);
  });

  onHourSelect(hour: string) {
    this.currentHour.set(hour);
    this.scrollToSelected('hours');
  }

  onMinuteSelect(minute: string) {
    this.currentMinute.set(minute);
    this.scrollToSelected('minutes');
  }

  togglePanel() {
    if (this.disabled) return;
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      setTimeout(() => {
        this.scrollToSelected('hours');
        this.scrollToSelected('minutes');
      }, 0);
    }
  }

  closePanel() {
    this.isOpen.set(false);
  }

  displayValue(): string {
    return `${this.currentHour()}:${this.currentMinute()}`;
  }

  private scrollToSelected(type: 'hours' | 'minutes') {
    const container =
      type === 'hours' ? this.hoursContainer?.nativeElement : this.minutesContainer?.nativeElement;
    if (!container) return;

    const selected = container.querySelector('[class*="time-option--selected"]');
    if (selected) {
      const containerHeight = container.clientHeight;
      const selectedTop = selected.offsetTop;
      const selectedHeight = selected.clientHeight;
      container.scrollTop = selectedTop - containerHeight / 2 + selectedHeight / 2;
    }
  }

  private emitValue(value: string) {
    this.onChange(value);
  }

  writeValue(value: string | null): void {
    if (value && typeof value === 'string') {
      const [hours, minutes] = value.split(':');
      this.currentHour.set(hours || '00');
      this.currentMinute.set(minutes || '00');
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onBlur() {
    this.onTouched();
    this.closePanel();
  }
}
