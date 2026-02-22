import { Component, ViewChild, input, output, effect, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  AbstractControl,
  FormControl,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VisibilityScope, SlotStatus } from '@meetwithfriends/shared';
import { DateOnlyPickerComponent } from '../../../../shared/components/date-time-picker/date-only-picker/date-only-picker.component';
import { Group } from '../../../../shared/models/group.model';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';
import { CustomTimepickerComponent } from '../../../../shared/components/custom-timepicker/custom-timepicker.component';
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
    status?: SlotStatus;
    isLocked?: boolean;
  }>;
}

function timeRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;

  if (!start || !end) return null;

  // Convert HH:mm format to minutes for accurate comparison
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // End time must be strictly after start time
  return endTotalMinutes > startTotalMinutes ? null : { invalidRange: true };
}

function overlappingValidator(array: AbstractControl): ValidationErrors | null {
  const slots = array.value;

  // First: Clean up any existing "overlapping" errors from all slots
  // This ensures we don't keep stale errors when slots are modified/removed
  for (let i = 0; i < slots.length; i++) {
    const group = (array as FormArray).at(i);
    if (group && group.errors && 'overlapping' in group.errors) {
      const updatedErrors = { ...group.errors };
      delete updatedErrors['overlapping'];
      // Set errors to null if no other errors exist, otherwise keep the remaining errors
      const hasOtherErrors = Object.keys(updatedErrors).length > 0;
      group.setErrors(hasOtherErrors ? updatedErrors : null);
    }
  }

  // Second: Check for overlapping slots only if there are 2 or more slots
  if (slots.length < 2) {
    return null; // Cannot overlap with fewer than 2 slots
  }

  let hasOverlap = false;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (isOverlapping(slots[i], slots[j])) {
        hasOverlap = true;
        const groupI = (array as FormArray).at(i);
        const groupJ = (array as FormArray).at(j);

        // Merge overlapping error with existing errors (preserve other errors like invalidRange)
        const errorsI = groupI.errors ? { ...groupI.errors } : {};
        const errorsJ = groupJ.errors ? { ...groupJ.errors } : {};
        errorsI['overlapping'] = true;
        errorsJ['overlapping'] = true;

        groupI.setErrors(errorsI);
        groupJ.setErrors(errorsJ);
      }
    }
  }

  return hasOverlap ? { overlappingRanges: true } : null;
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
    CustomTimepickerComponent,
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
  reservedByName = input<string>('');
  canReserve = input<boolean>(false);
  canCancelReservedSlot = input<boolean>(false);
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
  cancelReservedAction = output<string>();
  dateChange = output<string | null>();

  constructor(
    private translateService: TranslateService,
    private destroyRef: DestroyRef,
  ) {
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

    // Set up validators for all existing FormGroups
    for (let i = 0; i < timeSlots.length; i++) {
      this.setupFormGroupValidator(timeSlots.at(i) as FormGroup, timeSlots);
    }

    // Re-validate overlapping slots whenever any time slot value changes
    timeSlots.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      timeSlots.updateValueAndValidity({ emitEvent: false });
    });

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

    // Ensure form is valid before submitting
    if (this.formGroup().invalid) {
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
        status: slot.status as SlotStatus | undefined,
        isLocked: Boolean(slot.isLocked),
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

  getDateValue(): string | null {
    const value = this.formGroup().get('date')?.value;
    if (typeof value !== 'string') return null;
    return value || null;
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
    const timeSlots = this.getTimeSlots();

    // Calculate the next available time slot to avoid overlaps
    const nextSlot = this.getNextAvailableTimeSlot();

    const newSlotControl = this.createTimeSlotControl(nextSlot.startTime, nextSlot.endTime);
    timeSlots.push(newSlotControl);

    // Set up validator for the newly added FormGroup
    this.setupFormGroupValidator(newSlotControl, timeSlots);

    timeSlots.updateValueAndValidity({ emitEvent: false });
  }

  removeTimeSlot(index: number): void {
    if (this.isFriendSlot()) {
      return;
    }

    if (this.isSlotLocked(index)) {
      return;
    }

    const slots = this.getTimeSlots();
    slots.removeAt(index);
    slots.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Sets up real-time validation for a time slot FormGroup
   * Ensures timeRangeValidator runs whenever startTime or endTime changes
   * Manually sets errors like overlappingValidator does to ensure Angular detects them
   */
  private setupFormGroupValidator(formGroup: FormGroup, timeSlots: FormArray): void {
    const validateTimeRange = () => {
      const start = formGroup.get('startTime')?.value;
      const end = formGroup.get('endTime')?.value;

      if (!start || !end) return;

      // Convert HH:mm format to minutes for accurate comparison
      const [startHours, startMinutes] = start.split(':').map(Number);
      const [endHours, endMinutes] = end.split(':').map(Number);

      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      const isValid = endTotalMinutes > startTotalMinutes;

      // Manually set errors like overlappingValidator does
      if (!isValid) {
        const currentErrors = formGroup.errors ? { ...formGroup.errors } : {};
        currentErrors['invalidRange'] = true;
        formGroup.setErrors(currentErrors);
      } else {
        // Remove invalidRange error if now valid
        if (formGroup.errors && 'invalidRange' in formGroup.errors) {
          const updatedErrors = { ...formGroup.errors };
          delete updatedErrors['invalidRange'];
          const hasOtherErrors = Object.keys(updatedErrors).length > 0;
          formGroup.setErrors(hasOtherErrors ? updatedErrors : null);
        }
      }

      // Also re-validate the entire FormArray (triggers overlappingValidator)
      timeSlots.updateValueAndValidity({ emitEvent: false });
    };

    // Validate immediately with current values
    validateTimeRange();

    // Re-validate whenever time values change
    formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      validateTimeRange();
    });
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
    if (this.isFriendSlot() || this.isSlotLocked(index)) {
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
    if (this.isFriendSlot() || this.isSlotLocked(index)) {
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

  onCancelReservedSlot(): void {
    if (
      !this.canCancelReservedSlot() ||
      this.isSubmitting() ||
      this.selectedSlotStatus() !== SlotStatus.RESERVED
    ) {
      return;
    }

    const slotId = this.getTimeSlot(0)?.get('id')?.value;
    if (!slotId || typeof slotId !== 'string') {
      return;
    }

    this.cancelReservedAction.emit(slotId);
  }

  isFriendMode(): boolean {
    return this.isFriendSlot() || this.viewMode() === 'FRIEND';
  }

  getCreatorLabel(): string {
    const creator = (this.slotOwnerName() || this.creatorName()).trim();
    const label = this.translateService.instant('CALENDAR_PAGE.FORM.AVAILABILITY_OF');
    return creator ? `${label} ${creator}` : label;
  }

  getReservedByLabel(): string {
    const reservedBy = this.reservedByName().trim();
    const label = this.translateService.instant('CALENDAR_PAGE.FORM.RESERVED_BY');
    return reservedBy ? `${label}: ${reservedBy}` : label;
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

  isSlotLocked(slotIndex: number): boolean {
    if (this.isFriendSlot()) {
      return true;
    }

    const slot = this.getTimeSlot(slotIndex);
    if (!slot) return false;

    const isLockedValue = slot.get('isLocked')?.value;
    if (typeof isLockedValue === 'boolean') {
      return isLockedValue;
    }

    return slot.get('status')?.value === SlotStatus.RESERVED;
  }

  /**
   * Redondea la hora actual al intervalo de 15 minutos más cercano
   * Ej: 10:37 → 10:45, 10:43 → 10:45, 10:42 → 10:30
   */
  private getCurrentTimeRoundedTo15Min(): string {
    const now = new Date();
    let minutes = now.getMinutes();
    const remainder = minutes % 15;

    if (remainder !== 0) {
      if (remainder < 8) {
        // Redondear hacia atrás
        minutes -= remainder;
      } else {
        // Redondear hacia adelante
        minutes += 15 - remainder;
      }
    }

    if (minutes >= 60) {
      now.setHours(now.getHours() + 1);
      minutes = 0;
    }

    now.setMinutes(minutes);
    return this.formatTime(now);
  }

  /**
   * Calcula la hora de fin sumando 1 hora a la hora de inicio
   */
  private getEndTimeFromStartTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':');
    let hourNum = parseInt(hours, 10);
    const minNum = parseInt(minutes, 10);

    hourNum = (hourNum + 1) % 24; // Maneja el desbordamiento a media noche

    return `${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
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
   * Calcula el siguiente tramo horario disponible
   * Analiza los tramos existentes y retorna un slot que no se solape
   * Si hay tramos, usa la hora de fin del más tardío como hora de inicio del nuevo
   * Si no hay tramos, usa la hora actual redondeada
   */
  private getNextAvailableTimeSlot(): { startTime: string; endTime: string } {
    const timeSlots = this.getTimeSlots();
    const slots = timeSlots.value;

    // Si no hay slots o solo hay 1 slot vacío, usar el comportamiento por defecto
    if (!slots || slots.length === 0) {
      const startTime = this.getCurrentTimeRoundedTo15Min();
      const endTime = this.getEndTimeFromStartTime(startTime);
      return { startTime, endTime };
    }

    // Encontrar el slot con la hora de fin más tardía
    let latestEndTime = '00:00';
    for (const slot of slots) {
      const endTime = slot.endTime || '00:00';
      if (this.isTimeAfter(endTime, latestEndTime)) {
        latestEndTime = endTime;
      }
    }

    // El nuevo slot comienza cuando termina el último
    const startTime = latestEndTime;
    const endTime = this.getEndTimeFromStartTime(startTime);

    return { startTime, endTime };
  }

  /**
   * Compara si timeA es posterior a timeB en formato HH:mm
   */
  private isTimeAfter(timeA: string, timeB: string): boolean {
    const [hoursA, minutesA] = timeA.split(':').map(Number);
    const [hoursB, minutesB] = timeB.split(':').map(Number);

    const totalMinutesA = hoursA * 60 + minutesA;
    const totalMinutesB = hoursB * 60 + minutesB;

    return totalMinutesA > totalMinutesB;
  }

  /**
   * Crea un nuevo control de formulario para un time slot
   * Inicializa timezone automáticamente con la zona del navegador
   * Si se pasan startTime y endTime, los usa como iniciales
   * Si no, inicializa startTime con la hora actual redondeada a 15 minutos
   */
  private createTimeSlotControl(startTime?: string, endTime?: string): FormGroup {
    const initialStartTime = startTime || this.getCurrentTimeRoundedTo15Min();
    const initialEndTime = endTime || this.getEndTimeFromStartTime(initialStartTime);

    return new FormGroup(
      {
        startTime: new FormControl(initialStartTime, Validators.required),
        endTime: new FormControl(initialEndTime, Validators.required),
        notes: new FormControl(''),
        // Faltaban estos controles para que patchValue funcione:
        timezone: new FormControl(this.detectUserTimezone()),
        visibilityScope: new FormControl(VisibilityScope.FRIENDS),
        groupIds: new FormControl([]),
        status: new FormControl(SlotStatus.AVAILABLE),
        isLocked: new FormControl(false),
      },
      { validators: timeRangeValidator },
    );
  }

  private closePickers(): void {
    this.datePicker?.close();
  }
}
