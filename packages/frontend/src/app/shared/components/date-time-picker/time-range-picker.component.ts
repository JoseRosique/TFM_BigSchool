import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { buildTimeOptions } from './date-time-utils';

@Component({
  selector: 'app-time-range-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './time-range-picker.component.html',
  styleUrl: './time-range-picker.component.scss',
})
export class TimeRangePickerComponent {
  startTime = input<string | null>(null);
  endTime = input<string | null>(null);
  stepMinutes = input<number>(15);
  disabled = input<boolean>(false);

  startTimeChange = output<string | null>();
  endTimeChange = output<string | null>();
  openChange = output<boolean>();

  @ViewChild('popover') popover?: ElementRef<HTMLDivElement>;

  openPanel = signal<'start' | 'end' | null>(null);

  timeOptions = computed(() => buildTimeOptions(this.stepMinutes()));

  toggle(panel: 'start' | 'end'): void {
    if (this.disabled()) return;
    const next = this.openPanel() === panel ? null : panel;
    this.openPanel.set(next);
    this.openChange.emit(Boolean(next));
  }

  close(): void {
    if (!this.openPanel()) return;
    this.openPanel.set(null);
    this.openChange.emit(false);
  }

  selectStartTime(value: string): void {
    this.startTimeChange.emit(value || null);
    this.close();
  }

  selectEndTime(value: string): void {
    this.endTimeChange.emit(value || null);
    this.close();
  }

  isStartOpen(): boolean {
    return this.openPanel() === 'start';
  }

  isEndOpen(): boolean {
    return this.openPanel() === 'end';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openPanel()) return;
    if (!this.popover) return;
    const target = event.target as Node;
    if (!this.popover.nativeElement.contains(target)) {
      this.close();
    }
  }
}
