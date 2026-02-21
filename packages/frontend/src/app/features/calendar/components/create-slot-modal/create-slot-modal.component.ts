import { Component, ViewChild, input, output, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  AbstractControl,
  FormControl,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VisibilityScope, SlotStatus } from '@meetwithfriends/shared';
import { DateOnlyPickerComponent } from '../../../../shared/components/date-time-picker/date-only-picker/date-only-picker.component';
import { Group } from '../../../../shared/models/group.model';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';
import { ValidatorFn, ValidationErrors } from '@angular/forms';

interface CreateSlotModalPayload {
  date: string;
  timeSlots: Array<{
    id?: string;
    start: string;
    end: string;
    timezone: string;
    visibilityScope: VisibilityScope;
    groupIds: string[];
    notes?: string;
  }>;
}

function timeRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;

  if (!start || !end) return null;

  return end > start ? null : { invalidRange: true };
}

function overlappingValidator(array: AbstractControl): ValidationErrors | null {
  const slots = array.value;

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (isOverlapping(slots[i], slots[j])) {
        const groupI = (array as FormArray).at(i);
        const groupJ = (array as FormArray).at(j);

        // Merge overlapping error with existing errors
        const errorsI = groupI.errors ? { ...groupI.errors } : {};
        const errorsJ = groupJ.errors ? { ...groupJ.errors } : {};
        errorsI['overlapping'] = true;
        errorsJ['overlapping'] = true;

        groupI.setErrors(Object.keys(errorsI).length > 0 ? errorsI : null);
        groupJ.setErrors(Object.keys(errorsJ).length > 0 ? errorsJ : null);
        return { overlappingRanges: true };
      }
    }
  }

  return null;
}

function isOverlapping(slot1: any, slot2: any): boolean {
  const start1 = new Date(`1970-01-01T${slot1.startTime}:00`);
  const end1 = new Date(`1970-01-01T${slot1.endTime}:00`);
  const start2 = new Date(`1970-01-01T${slot2.startTime}:00`);
  const end2 = new Date(`1970-01-01T${slot2.endTime}:00`);

  return start1 < end2 && start2 < end1;
}

@Component({
  selector: 'app-create-slot-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DateOnlyPickerComponent,
    CustomSelectComponent,
  ],
  templateUrl: './create-slot-modal.component.html',
  styleUrl: './create-slot-modal.component.scss',
})
export class CreateSlotModalComponent implements OnInit {
  formGroup = input.required<FormGroup>();
  isFriendSlot = input<boolean>(false);
  slotOwnerName = input<string>('');
  viewMode = input<'OWN' | 'FRIEND'>('OWN');
  creatorName = input<string>('');
  canReserve = input<boolean>(false);
  selectedSlotStatus = input<SlotStatus | null>(null);

  displayTimezone = input<string>('UTC');

  /**
   * Formats a Date object into a time string (HH:mm)
   */
  private formatTime(date: Date): string {
    return date.toISOString().substring(11, 16); // Extracts HH:mm from ISO string
  }
  timezones = input<{ value: string; label: string }[]>([]);
  visibilityScope = input<typeof VisibilityScope>(VisibilityScope);
  userGroups = input<Group[]>([]);
  isLoadingGroups = input<boolean>(false);
  isDateLocked = input<boolean>(false);
  isSubmitting = input<boolean>(false);
  isEditMode = input<boolean>(false);

  @ViewChild(DateOnlyPickerComponent) datePicker?: DateOnlyPickerComponent;

  close = output<void>();
  submitAction = output<CreateSlotModalPayload>();
  reserveAction = output<string>();
  dateChange = output<string | null>();

  constructor(private translateService: TranslateService) {
    effect(() => {
      // Reactive track of form changes for internal state management
      this.formGroup();
    });
  }

  ngOnInit(): void {
    const timeSlots = this.formGroup().get('timeSlots') as FormArray;
    if (timeSlots.length === 0) {
      timeSlots.push(this.createTimeSlotControl());
    }

    // Attach overlappingValidator to check for overlapping slots
    timeSlots.setValidators(overlappingValidator);
    timeSlots.updateValueAndValidity({ emitEvent: false });

    if (this.isFriendSlot()) {
      this.formGroup().disable({ emitEvent: false });
    }
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
    if (this.isFriendSlot()) {
      return;
    }

    const formValue = this.formGroup().getRawValue();
    const timeSlots = this.getTimeSlots().getRawValue();

    const payload: CreateSlotModalPayload = {
      ...formValue,
      date: String(formValue.date ?? ''),
      timeSlots: timeSlots.map((slot: any) => ({
        id: slot.id,
        start: slot.startTime,
        end: slot.endTime,
        timezone: slot.timezone,
        visibilityScope: slot.visibilityScope as VisibilityScope,
        groupIds: Array.isArray(slot.groupIds) ? slot.groupIds : [],
        notes: slot.notes ?? '',
      })),
    };

    this.submitAction.emit(payload);
  }

  onDateOpenChange(isOpen: boolean): void {
    if (isOpen) {
      // Date picker opened
    }
  }

  onDateChange(value: string | null): void {
    if (this.isFriendSlot()) {
      return;
    }
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
    if (this.isFriendSlot()) {
      return;
    }
    // New slots don't have an ID, parent component tracks those in deletedSlotIds
    this.getTimeSlots().push(this.createTimeSlotControl());
  }

  removeTimeSlot(index: number): void {
    if (this.isFriendSlot()) {
      return;
    }
    const slots = this.getTimeSlots();
    slots.removeAt(index);
  }

  /**
   * Obtiene el valor combinado de visibilidad para el select
   * Combina visibilityScope y groupIds en un único valor
   * Formato: 'PRIVATE', 'FRIENDS', o 'GROUP:{groupId}'
   */
  getVisibilityValue(slotIndex: number): string {
    const slot = this.getTimeSlot(slotIndex);
    if (!slot) return VisibilityScope.FRIENDS;

    const scope = slot.get('visibilityScope')?.value;
    const groupIds = slot.get('groupIds')?.value || [];

    if (scope === VisibilityScope.LIST && groupIds.length > 0) {
      return groupIds[0];
    }

    return scope || VisibilityScope.FRIENDS;
  }

  /**
   * Maneja el cambio de visibilidad del select
   * Parsea el valor y actualiza visibilityScope y groupIds apropiadamente
   */
  onVisibilityChange(value: string, index: number): void {
    if (this.isFriendSlot()) {
      return;
    }

    const slot = this.getTimeSlots().at(index);
    if (!slot) return;

    const isFixedScope =
      value === VisibilityScope.PRIVATE ||
      value === VisibilityScope.FRIENDS ||
      value === VisibilityScope.LIST;

    if (!isFixedScope) {
      slot.patchValue({
        visibilityScope: VisibilityScope.LIST,
        groupIds: [value],
      });
    } else {
      slot.patchValue({
        visibilityScope: value as VisibilityScope,
        groupIds: [],
      });
    }
  }

  /**
   * Obtiene las opciones de timezone en formato SelectOption
   */
  getTimezoneOptions(): SelectOption[] {
    return this.timezones().map((tz) => ({
      value: tz.value,
      label: tz.label,
    }));
  }

  /**
   * Obtiene las opciones de visibilidad en formato SelectOption con grupos
   */
  getVisibilityOptions(): SelectOption[] {
    const options: SelectOption[] = [];

    // Opciones básicas
    options.push({
      value: VisibilityScope.PRIVATE,
      label: this.translateService.instant('CALENDAR_PAGE.VISIBILITY.PRIVATE'),
    });

    const friendsLabel = this.translateService.instant('CALENDAR_PAGE.VISIBILITY.FRIENDS');
    const noGroupsHint = this.translateService.instant('CALENDAR_PAGE.FORM.NO_GROUPS_HINT');

    options.push({
      value: VisibilityScope.FRIENDS,
      label: this.userGroups().length === 0 ? `${friendsLabel} (${noGroupsHint})` : friendsLabel,
    });

    // Grupos del usuario
    if (this.userGroups().length > 0) {
      const myGroupsLabel = this.translateService.instant('CALENDAR_PAGE.FORM.MY_GROUPS');
      this.userGroups().forEach((group) => {
        options.push({
          value: group.id,
          label: group.name,
          group: myGroupsLabel,
        });
      });
    }

    return options;
  }

  /**
   * Maneja el cambio de timezone desde el custom select
   */
  onTimezoneChange(value: string, index: number): void {
    if (this.isFriendSlot()) {
      return;
    }

    const slot = this.getTimeSlots().at(index);
    if (!slot) return;
    slot.patchValue({ timezone: value });
  }

  onReserve(): void {
    if (
      !this.canReserve() ||
      this.isSubmitting() ||
      this.selectedSlotStatus() !== SlotStatus.AVAILABLE
    ) {
      return;
    }

    const slotId = this.getTimeSlot(0)?.get('id')?.value;
    if (!slotId || typeof slotId !== 'string') {
      return;
    }

    this.reserveAction.emit(slotId);
  }

  isFriendMode(): boolean {
    return this.isFriendSlot() || this.viewMode() === 'FRIEND';
  }

  getCreatorLabel(): string {
    const creator = (this.slotOwnerName() || this.creatorName()).trim();
    const label = this.translateService.instant('CALENDAR_PAGE.FORM.AVAILABILITY_OF');
    return creator ? `${label} ${creator}` : label;
  }

  getVisibilityLabel(slotIndex: number): string {
    const value = this.getVisibilityValue(slotIndex);
    if (
      value !== VisibilityScope.PRIVATE &&
      value !== VisibilityScope.FRIENDS &&
      value !== VisibilityScope.LIST
    ) {
      const groupId = value;
      const group = this.userGroups().find((item) => item.id === groupId);
      return group?.name || groupId;
    }

    if (value === VisibilityScope.PRIVATE) {
      return this.translateService.instant('CALENDAR_PAGE.VISIBILITY.PRIVATE');
    }

    return this.translateService.instant('CALENDAR_PAGE.VISIBILITY.FRIENDS');
  }

  /**
   * Obtiene el valor de timezone para un slot específico
   */
  getTimezoneValue(slotIndex: number): string {
    const slot = this.getTimeSlot(slotIndex);
    return slot?.get('timezone')?.value || this.displayTimezone();
  }

  hasNotes(slotIndex: number): boolean {
    const slot = this.getTimeSlot(slotIndex);
    const notes = slot?.get('notes')?.value;
    return typeof notes === 'string' && notes.trim().length > 0;
  }

  getNotesValue(slotIndex: number): string {
    const slot = this.getTimeSlot(slotIndex);
    const notes = slot?.get('notes')?.value;
    return typeof notes === 'string' ? notes.trim() : '';
  }

  /**
   * Detecta automáticamente la zona horaria del navegador del usuario
   * Usa Intl API con fallback a UTC si falla
   */
  private detectUserTimezone(): string {
    const currentTz = this.displayTimezone ? this.displayTimezone() : 'UTC';

    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Verificar que la zona detectada está en la lista de zonas disponibles
      const validZone = this.timezones().find((tz) => tz.value === detectedTz);
      return validZone ? detectedTz : currentTz;
    } catch {
      return currentTz;
    }
  }

  /**
   * Crea un nuevo control de formulario para un time slot
   * Inicializa timezone automáticamente con la zona del navegador
   */
  private createTimeSlotControl(): FormGroup {
    return new FormGroup(
      {
        startTime: new FormControl('', Validators.required),
        endTime: new FormControl('', Validators.required),
        notes: new FormControl(''),
        // Faltaban estos controles para que patchValue funcione:
        timezone: new FormControl(this.detectUserTimezone()),
        visibilityScope: new FormControl(VisibilityScope.FRIENDS),
        groupIds: new FormControl([]),
      },
      { validators: timeRangeValidator },
    );
  }

  private closePickers(): void {
    this.datePicker?.close();
  }
}
