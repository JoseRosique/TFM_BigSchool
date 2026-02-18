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
import { VisibilityScope } from '@meetwithfriends/shared';
import { DateOnlyPickerComponent } from '../../../../shared/components/date-time-picker/date-only-picker/date-only-picker.component';
import { Group } from '../../../../shared/models/group.model';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';

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
  formGroup = input<FormGroup>(new FormGroup({}));
  displayTimezone = input<string>('UTC');
  timezones = input<{ value: string; label: string }[]>([]);
  visibilityScope = input<typeof VisibilityScope>(VisibilityScope);
  userGroups = input<Group[]>([]);
  isLoadingGroups = input<boolean>(false);
  isDateLocked = input<boolean>(false);
  isSubmitting = input<boolean>(false);
  isEditMode = input<boolean>(false);

  @ViewChild(DateOnlyPickerComponent) datePicker?: DateOnlyPickerComponent;

  close = output<void>();
  submitAction = output<void>();
  dateChange = output<string | null>();

  constructor(private translateService: TranslateService) {
    effect(() => {
      // Reactive track of form changes for internal state management
      this.formGroup();
    });
  }

  ngOnInit(): void {
    // Inicialización del componente - las validaciones ya están configuradas en el padre
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
      // Si es LIST con un grupo, retornar GROUP:{id}
      return `GROUP:${groupIds[0]}`;
    }

    return scope || VisibilityScope.FRIENDS;
  }

  /**
   * Maneja el cambio de visibilidad del select
   * Parsea el valor y actualiza visibilityScope y groupIds apropiadamente
   */
  onVisibilityChange(value: string, slotIndex: number): void {
    const slot = this.getTimeSlot(slotIndex);
    if (!slot) return;

    if (value.startsWith('GROUP:')) {
      // Extraer el groupId
      const groupId = value.replace('GROUP:', '');
      slot.patchValue({
        visibilityScope: VisibilityScope.LIST,
        groupIds: [groupId],
      });
    } else {
      // PRIVATE o FRIENDS
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
          value: `GROUP:${group.id}`,
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
  onTimezoneChange(value: string, slotIndex: number): void {
    const slot = this.getTimeSlot(slotIndex);
    if (!slot) return;
    slot.patchValue({ timezone: value });
  }

  /**
   * Obtiene el valor de timezone para un slot específico
   */
  getTimezoneValue(slotIndex: number): string {
    const slot = this.getTimeSlot(slotIndex);
    return slot?.get('timezone')?.value || this.displayTimezone();
  }

  /**
   * Detecta automáticamente la zona horaria del navegador del usuario
   * Usa Intl API con fallback a UTC si falla
   */
  private detectUserTimezone(): string {
    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Verificar que la zona detectada está en la lista de zonas disponibles
      const validZone = this.timezones().find((tz) => tz.value === detectedTz);
      return validZone ? detectedTz : this.displayTimezone();
    } catch {
      return this.displayTimezone();
    }
  }

  /**
   * Crea un nuevo control de formulario para un time slot
   * Inicializa timezone automáticamente con la zona del navegador
   */
  private createTimeSlotControl(): FormGroup {
    const detectedTimezone = this.detectUserTimezone();
    return new FormGroup({
      id: new FormControl(null),
      startTime: new FormControl('', Validators.required),
      endTime: new FormControl('', Validators.required),
      timezone: new FormControl(detectedTimezone, Validators.required),
      visibilityScope: new FormControl(VisibilityScope.FRIENDS, Validators.required),
      groupIds: new FormControl([]),
      notes: new FormControl('', Validators.maxLength(500)),
    });
  }

  private closePickers(): void {
    this.datePicker?.close();
  }
}
