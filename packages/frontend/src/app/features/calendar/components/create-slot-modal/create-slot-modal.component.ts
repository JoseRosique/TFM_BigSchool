import { Component, ViewChild, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { VisibilityScope } from '@meetwithfriends/shared';
import { DateOnlyPickerComponent } from '../../../../shared/components/date-time-picker/date-only-picker/date-only-picker.component';
import { TimeRangePickerComponent } from '../../../../shared/components/date-time-picker/time-range-picker/time-range-picker.component';

@Component({
  selector: 'app-create-slot-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DateOnlyPickerComponent,
    TimeRangePickerComponent,
  ],
  templateUrl: './create-slot-modal.component.html',
  styleUrl: './create-slot-modal.component.scss',
})
export class CreateSlotModalComponent {
  formGroup = input<FormGroup>(new FormGroup({}));
  displayTimezone = input<string>('UTC');
  timezones = input<{ value: string; label: string }[]>([]);
  visibilityScope = input<typeof VisibilityScope>(VisibilityScope);
  isDateLocked = input<boolean>(false);
  isSubmitting = input<boolean>(false);

  @ViewChild(DateOnlyPickerComponent) datePicker?: DateOnlyPickerComponent;
  @ViewChild(TimeRangePickerComponent) timeRangePicker?: TimeRangePickerComponent;

  close = output<void>();
  submitAction = output<void>();
  dateChange = output<string | null>();
  startTimeChange = output<string | null>();
  endTimeChange = output<string | null>();
  notesInput = output<Event>();

  onOverlayClick(): void {
    this.closePickers();
    this.close.emit();
  }

  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickedPicker = target.closest('.date-picker, .time-range');
    if (clickedPicker) return;
    this.closePickers();
  }

  onClose(): void {
    this.closePickers();
    this.close.emit();
  }

  onSubmit(): void {
    this.submitAction.emit();
  }

  onDateOpenChange(isOpen: boolean): void {
    if (isOpen) {
      this.timeRangePicker?.close();
    }
  }

  onTimeOpenChange(isOpen: boolean): void {
    if (isOpen) {
      this.datePicker?.close();
    }
  }

  onDateChange(value: string | null): void {
    this.dateChange.emit(value);
  }

  onStartTimeChange(value: string | null): void {
    this.startTimeChange.emit(value);
  }

  onEndTimeChange(value: string | null): void {
    this.endTimeChange.emit(value);
  }

  onNotesInput(event: Event): void {
    this.notesInput.emit(event);
  }

  private closePickers(): void {
    this.datePicker?.close();
    this.timeRangePicker?.close();
  }
}
