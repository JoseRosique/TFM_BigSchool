import { Component, ViewChild, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  AbstractControl,
  FormControl,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { VisibilityScope } from '@meetwithfriends/shared';
import { DateOnlyPickerComponent } from '../../../../shared/components/date-time-picker/date-only-picker/date-only-picker.component';

@Component({
  selector: 'app-create-slot-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, DateOnlyPickerComponent],
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
  isEditMode = input<boolean>(false);

  @ViewChild(DateOnlyPickerComponent) datePicker?: DateOnlyPickerComponent;

  close = output<void>();
  submitAction = output<void>();
  dateChange = output<string | null>();

  constructor() {
    effect(() => {
      // Reactive track of form changes for internal state management
      this.formGroup();
    });
  }

  onOverlayClick(): void {
    this.closePickers();
    this.close.emit();
  }

  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickedPicker = target.closest('.date-picker, .slot-card');
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
      // Date picker opened
    }
  }

  onDateChange(value: string | null): void {
    this.dateChange.emit(value);
  }

  getTimeSlots(): FormArray {
    const control = this.formGroup().get('timeSlots');
    if (!(control instanceof FormArray)) {
      throw new Error('timeSlots control is not a FormArray');
    }
    return control;
  }

  getTimeSlot(index: number): AbstractControl | null {
    const slots = this.getTimeSlots();
    return slots?.at(index) || null;
  }

  addTimeSlot(): void {
    // New slots don't have an ID, parent component tracks those in deletedSlotIds
    this.getTimeSlots().push(this.createTimeSlotControl());
  }

  removeTimeSlot(index: number): void {
    const slots = this.getTimeSlots();
    slots.removeAt(index);
  }

  private createTimeSlotControl(): FormGroup {
    return new FormGroup({
      id: new FormControl(null),
      startTime: new FormControl('', Validators.required),
      endTime: new FormControl('', Validators.required),
      timezone: new FormControl(this.displayTimezone(), Validators.required),
      visibilityScope: new FormControl(VisibilityScope.FRIENDS, Validators.required),
      notes: new FormControl('', Validators.maxLength(500)),
    });
  }

  private closePickers(): void {
    this.datePicker?.close();
  }
}
