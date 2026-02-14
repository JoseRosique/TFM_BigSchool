import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormArray,
  FormGroup,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SlotStatus, VisibilityScope } from '@meetwithfriends/shared';
import { forkJoin, of } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';

import {
  combineDateAndTimeInTimeZone,
  formatDateInputValue,
  formatTimeInTimeZone,
} from '../../../shared/components/date-time-picker/date-time-utils';
import { CalendarFacade } from '../state/calendar.facade';
import { CalendarSlot, ReservationItem } from '../calendar.types';
import { CalendarHeroComponent } from '../components/calendar-hero/calendar-hero.component';
import { CalendarToolbarComponent } from '../components/calendar-toolbar/calendar-toolbar.component';
import { CalendarMonthGridComponent } from '../components/calendar-month-grid/calendar-month-grid.component';
import { ReservationsPanelComponent } from '../components/reservations-panel/reservations-panel.component';
import { LegendPanelComponent } from '../components/legend-panel/legend-panel.component';
import { CreateSlotModalComponent } from '../components/create-slot-modal/create-slot-modal.component';
import { ConfirmDeleteModalComponent } from '../components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    CalendarHeroComponent,
    CalendarToolbarComponent,
    CalendarMonthGridComponent,
    ReservationsPanelComponent,
    LegendPanelComponent,
    CreateSlotModalComponent,
    ConfirmDeleteModalComponent,
  ],
  templateUrl: './calendar-page.component.html',
  styleUrls: ['./calendar-page.component.scss'],
})
export class CalendarPageComponent implements OnInit {
  private readonly facade = inject(CalendarFacade);
  private readonly toastService = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly slotStatus = SlotStatus;
  readonly visibilityScope = VisibilityScope;
  readonly maxItemsPerDay = this.facade.maxItemsPerDay;

  viewMode = this.facade.viewMode;
  viewDate = this.facade.viewDate;
  slots = this.facade.slots;
  reservations = this.facade.reservations;
  isLoadingSlots = this.facade.isLoadingSlots;
  isLoadingReservations = this.facade.isLoadingReservations;
  isCreating = signal(false);
  isLoading = signal(false);
  processingSlotId = signal<string | null>(null);
  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  isDateLocked = signal(false);
  displayTimezone = this.facade.displayTimezone;
  currentUserId = this.facade.currentUserId;
  deletedSlotIds = signal<string[]>([]);

  pendingDeleteSlot = signal<CalendarSlot | null>(null);
  editingSlot = signal<CalendarSlot | null>(null);
  isEditMode = signal(false);

  timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'America/New_York' },
    { value: 'Europe/London', label: 'Europe/London' },
    { value: 'Europe/Madrid', label: 'Europe/Madrid' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney' },
  ];

  createSlotForm = this.fb.group({
    date: ['', Validators.required],
    timeSlots: this.fb.array(
      [],
      [this.timeIsAfterValidator.bind(this), this.noOverlappingRangesValidator.bind(this)],
    ),
  });

  private createTimeSlotControl(
    id?: string,
    notes?: string,
    timezone?: string,
    visibilityScope?: VisibilityScope,
  ) {
    return this.fb.group({
      id: [id || null],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      timezone: [timezone || this.displayTimezone(), Validators.required],
      visibilityScope: [visibilityScope || VisibilityScope.FRIENDS, Validators.required],
      notes: [notes || '', Validators.maxLength(500)],
    });
  }

  private timeIsAfterValidator(control: AbstractControl): ValidationErrors | null {
    const array = control as FormArray;
    if (!array.controls) return null;

    for (const group of array.controls) {
      const startTime = group.get('startTime')?.value;
      const endTime = group.get('endTime')?.value;
      if (startTime && endTime && endTime <= startTime) {
        return { invalidTimeRange: true };
      }
    }
    return null;
  }

  private noOverlappingRangesValidator(control: AbstractControl): ValidationErrors | null {
    const array = control as FormArray;
    if (!array.controls || array.controls.length < 2) return null;

    const ranges = array.controls
      .map((group) => ({
        start: group.get('startTime')?.value,
        end: group.get('endTime')?.value,
      }))
      .filter((range) => range.start && range.end);

    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const range1 = ranges[i];
        const range2 = ranges[j];
        if (!(range1.end <= range2.start || range2.end <= range1.start)) {
          return { overlappingRanges: true };
        }
      }
    }
    return null;
  }

  monthLabel = this.facade.monthLabel;
  monthWeekdays = this.facade.monthWeekdays;
  monthGrid = this.facade.monthGrid;
  monthDayViews = this.facade.monthDayViews;
  slotsByDay = this.facade.slotsByDay;
  reservationsByDay = this.facade.reservationsByDay;

  private readonly handleSlotLoadErrors = effect(() => {
    const error = this.facade.slotsErrorKey();
    if (!error) return;
    this.toastService.error(error);
    this.facade.clearSlotsError();
  });

  private readonly handleReservationLoadErrors = effect(() => {
    const error = this.facade.reservationsErrorKey();
    if (!error) return;
    this.toastService.error(error);
    this.facade.clearReservationsError();
  });

  private readonly handleProfileLoadErrors = effect(() => {
    const error = this.facade.profileErrorKey();
    if (!error) return;
    this.toastService.error(error);
    this.facade.clearProfileError();
  });

  ngOnInit(): void {
    this.facade.init();
  }

  setViewMode(mode: 'mine' | 'explore'): void {
    this.facade.setViewMode(mode);
  }

  goToToday(): void {
    this.facade.goToToday();
  }

  navigateMonth(step: number): void {
    this.facade.navigateMonth(step);
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingSlot.set(null);
    this.initializeSlotForm(formatDateInputValue(new Date()), []);
    this.isDateLocked.set(false);
    this.showCreateModal.set(true);
  }

  openCreateModalForDayKey(dayKey: string): void {
    // Load all slots for this day into the FormArray
    const slotsForDay = this.slotsByDay().get(dayKey) ?? [];

    // Set edit mode to true if there are existing slots for this day
    const hasExistingSlots = slotsForDay && slotsForDay.length > 0;
    this.isEditMode.set(hasExistingSlots);
    this.editingSlot.set(null);

    this.initializeSlotForm(dayKey, slotsForDay);
    this.isDateLocked.set(true);
    this.showCreateModal.set(true);
  }

  openEditSlotModal(slot: CalendarSlot): void {
    this.isEditMode.set(true);
    this.editingSlot.set(slot);
    const dateKey =
      slot.startDate instanceof Date ? formatDateInputValue(slot.startDate) : slot.startDate;

    // Load all slots for this day
    const slotsForDay = this.slotsByDay().get(dateKey) ?? [];
    this.initializeSlotForm(dateKey, slotsForDay);
    this.isDateLocked.set(true);

    setTimeout(() => {
      this.showCreateModal.set(true);
    }, 0);
  }

  updateSlotDate(dateValue: string | null): void {
    this.createSlotForm.patchValue({ date: dateValue ?? '' });
  }

  addTimeRange(): void {
    const timeSlots = this.createSlotForm.get('timeSlots') as FormArray;
    timeSlots.push(this.createTimeSlotControl());
  }

  removeTimeRange(index: number): void {
    const timeSlots = this.createSlotForm.get('timeSlots') as FormArray;
    if (timeSlots.length > 1) {
      timeSlots.removeAt(index);
    }
  }

  getTimeRanges(): FormArray {
    return this.createSlotForm.get('timeSlots') as FormArray;
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.isEditMode.set(false);
    this.editingSlot.set(null);
    this.deletedSlotIds.set([]);
  }

  removeTimeSlotByIndex(index: number): void {
    const timeSlots = this.createSlotForm.get('timeSlots') as FormArray;
    if (timeSlots.length <= 1) return;

    const slotControl = timeSlots.at(index);
    const slotId = slotControl?.get('id')?.value;

    // If slot has an ID, add it to deletedSlotIds for backend deletion
    if (slotId) {
      const deleted = this.deletedSlotIds();
      this.deletedSlotIds.set([...deleted, slotId]);
    }

    timeSlots.removeAt(index);
  }

  submitCreateSlot(): void {
    // Prevent double submission with isLoading
    if (this.isLoading() || this.isCreating()) return;
    if (this.createSlotForm.invalid) {
      this.createSlotForm.markAllAsTouched();
      return;
    }

    const { date, timeSlots } = this.createSlotForm.value;
    const timeSlotsArray =
      (timeSlots as Array<{
        id?: string;
        startTime: string;
        endTime: string;
        timezone: string;
        visibilityScope: VisibilityScope;
        notes?: string;
      }>) || [];

    // Validate all slots (only if there are slots)
    for (const slot of timeSlotsArray) {
      const start = combineDateAndTimeInTimeZone(date as string, slot.startTime, slot.timezone);
      const end = combineDateAndTimeInTimeZone(date as string, slot.endTime, slot.timezone);
      if (!start || !end || end <= start) {
        this.toastService.error('CALENDAR_PAGE.FORM.ERROR_END_BEFORE_START');
        return;
      }
    }

    // Detect deleted slots automatically:
    // Compare existing IDs with form IDs to find what was deleted
    const dayKey = date as string;
    const daySlots = this.slotsByDay().get(dayKey) ?? [];
    const ownSlots = daySlots.filter((s: CalendarSlot) => s.ownerId === this.currentUserId());
    const originalIds = new Set(ownSlots.map((s) => s.id));

    // IDs still present in form
    const formIds = new Set(timeSlotsArray.filter((s) => s.id).map((s) => s.id));

    // IDs removed (were in original but not in form)
    const autoDeletedIds = Array.from(originalIds).filter((id) => !formIds.has(id));
    const allDeletedIds = Array.from(new Set([...this.deletedSlotIds(), ...autoDeletedIds]));
    this.deletedSlotIds.set(allDeletedIds);

    this.isLoading.set(true);
    this.isCreating.set(true);

    // Atomic operation: handle deletions + upserts in a single transaction
    this.syncSlotChanges(timeSlotsArray, date as string);
  }

  private syncSlotChanges(
    timeSlotsArray: Array<{
      id?: string;
      startTime: string;
      endTime: string;
      timezone: string;
      visibilityScope: VisibilityScope;
      notes?: string;
    }>,
    date: string,
  ): void {
    // Separate new slots (no id) from updates (has id)
    const newSlots = timeSlotsArray.filter((s) => !s.id);
    const updatedSlots = timeSlotsArray.filter((s) => s.id);
    const deletedIds = this.deletedSlotIds();

    // Build creation requests for new slots
    const createRequests = newSlots.map((slot) => {
      const start = combineDateAndTimeInTimeZone(date, slot.startTime, slot.timezone);
      const end = combineDateAndTimeInTimeZone(date, slot.endTime, slot.timezone);
      return {
        start: start!.toISOString(),
        end: end!.toISOString(),
        timezone: slot.timezone,
        visibilityScope: slot.visibilityScope,
        notes: slot.notes || undefined,
      };
    });

    // Build update requests for existing slots
    const updateRequests = updatedSlots.map((slot) => {
      const start = combineDateAndTimeInTimeZone(date, slot.startTime, slot.timezone);
      const end = combineDateAndTimeInTimeZone(date, slot.endTime, slot.timezone);
      return {
        id: slot.id!,
        payload: {
          start: start!.toISOString(),
          end: end!.toISOString(),
          timezone: slot.timezone,
          visibilityScope: slot.visibilityScope,
          notes: slot.notes || undefined,
        },
      };
    });

    // Execute all operations in parallel
    const operations: { create?: any[]; update?: any[]; delete?: string[] } = {};

    if (createRequests.length > 0) operations.create = createRequests;
    if (updateRequests.length > 0) operations.update = updateRequests;
    if (deletedIds.length > 0) operations.delete = deletedIds;

    // If nothing changed, close modal
    if (Object.keys(operations).length === 0) {
      this.isLoading.set(false);
      this.isCreating.set(false);
      this.showCreateModal.set(false);
      this.isEditMode.set(false);
      this.editingSlot.set(null);
      this.deletedSlotIds.set([]);
      return;
    }

    const observables = [];

    // Create new slots
    if (createRequests.length > 0) {
      for (const req of createRequests) {
        observables.push(this.facade.createSlot(req));
      }
    }

    // Update existing slots
    if (updateRequests.length > 0) {
      for (const req of updateRequests) {
        observables.push(this.facade.updateSlot(req.id, req.payload));
      }
    }

    // Delete slots
    if (deletedIds.length > 0) {
      for (const id of deletedIds) {
        observables.push(this.facade.deleteSlot(id));
      }
    }

    // Execute all operations in parallel
    if (observables.length > 0) {
      const wasEdit = this.isEditMode();
      forkJoin(observables).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.isCreating.set(false);
          this.showCreateModal.set(false);
          this.isEditMode.set(false);
          this.editingSlot.set(null);
          this.deletedSlotIds.set([]);
          const message = wasEdit ? 'CALENDAR_PAGE.TOASTS.UPDATED' : 'CALENDAR_PAGE.TOASTS.CREATED';
          this.toastService.success(message);
          this.facade.loadSlots();
        },
        error: () => {
          const wasEdit = this.isEditMode();
          this.isLoading.set(false);
          this.isCreating.set(false);
          const message = wasEdit
            ? 'CALENDAR_PAGE.TOASTS.UPDATE_ERROR'
            : 'CALENDAR_PAGE.TOASTS.CREATE_ERROR';
          this.toastService.error(message);
        },
      });
    }
  }

  // Deprecated: Use syncSlotChanges instead for atomic operations
  private createSlotsBatch(
    timeSlotsArray: Array<{ id?: string; startTime: string; endTime: string }>,
    date: string,
    selectedTimezone: string,
    visibilityScope: VisibilityScope,
    notes: string,
  ) {
    // Create all NEW slots from the array (no id) in parallel
    const newSlots = timeSlotsArray.filter((s) => !s.id);
    const createObservables = newSlots.map((slot) => {
      const start = combineDateAndTimeInTimeZone(date, slot.startTime, selectedTimezone);
      const end = combineDateAndTimeInTimeZone(date, slot.endTime, selectedTimezone);
      const slotData = {
        start: start!.toISOString(),
        end: end!.toISOString(),
        timezone: selectedTimezone,
        visibilityScope,
        notes: notes || undefined,
      };
      return this.facade.createSlot(slotData);
    });

    // Send all create requests in parallel
    return forkJoin(createObservables.length > 0 ? createObservables : [of(null)]);
  }

  reserveSlot(slot: CalendarSlot): void {
    if (this.processingSlotId()) return;
    this.processingSlotId.set(slot.id);
    this.facade.reserveSlot(slot.id).subscribe({
      next: () => {
        this.processingSlotId.set(null);
        this.toastService.success('CALENDAR_PAGE.TOASTS.RESERVED');
        this.facade.reloadAll();
      },
      error: () => {
        this.processingSlotId.set(null);
        this.toastService.error('CALENDAR_PAGE.TOASTS.RESERVE_ERROR');
      },
    });
  }

  cancelReservation(reservationId: string): void {
    if (this.processingSlotId()) return;
    this.processingSlotId.set(reservationId);
    this.facade.cancelReservation(reservationId).subscribe({
      next: () => {
        this.processingSlotId.set(null);
        this.toastService.success('CALENDAR_PAGE.TOASTS.RESERVATION_CANCELED');
        this.facade.reloadAll();
      },
      error: () => {
        this.processingSlotId.set(null);
        this.toastService.error('CALENDAR_PAGE.TOASTS.RESERVATION_CANCEL_ERROR');
      },
    });
  }

  openDeleteModal(slot: CalendarSlot): void {
    if (this.processingSlotId()) return;
    this.pendingDeleteSlot.set(slot);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.pendingDeleteSlot.set(null);
  }

  confirmDeleteSlot(): void {
    const slot = this.pendingDeleteSlot();
    if (!slot) return;
    if (this.processingSlotId()) return;
    this.processingSlotId.set(slot.id);
    this.facade.deleteSlot(slot.id).subscribe({
      next: () => {
        this.processingSlotId.set(null);
        this.closeDeleteModal();
        this.toastService.success('CALENDAR_PAGE.TOASTS.SLOT_DELETED');
        this.facade.loadSlots();
      },
      error: () => {
        this.processingSlotId.set(null);
        this.closeDeleteModal();
        this.toastService.error('CALENDAR_PAGE.TOASTS.SLOT_DELETE_ERROR');
      },
    });
  }

  slotsForDay(dayKey: string): CalendarSlot[] {
    return this.facade.slotsForDay(dayKey);
  }

  visibleSlotsForDay(dayKey: string): CalendarSlot[] {
    return this.facade.visibleSlotsForDay(dayKey);
  }

  moreSlotsCount(dayKey: string): number {
    return this.facade.moreSlotsCount(dayKey);
  }

  availableCount(dayKey: string): number {
    return this.facade.availableCount(dayKey);
  }

  confirmedCount(dayKey: string): number {
    return this.facade.confirmedCount(dayKey);
  }

  pendingCount(dayKey: string): number {
    return this.facade.pendingCount(dayKey);
  }

  statusKey(status: SlotStatus): string {
    return `CALENDAR_PAGE.STATUS.${status.toUpperCase()}`;
  }

  reservationStatusKey(status: string): string {
    return `CALENDAR_PAGE.RESERVATION_STATUS.${status.toUpperCase()}`;
  }

  readonly formatTimeRange = (start: Date, end: Date, timeZone: string): string => {
    const locale = this.translate.currentLang || 'en';
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  };

  private initializeSlotForm(dateValue: string, slots: CalendarSlot[]): void {
    const timeSlots = this.createSlotForm.get('timeSlots') as FormArray;

    // Clear all existing slots
    while (timeSlots.length > 0) {
      timeSlots.removeAt(0);
    }

    // Load slots from the day
    if (slots && slots.length > 0) {
      for (const slot of slots) {
        const startDate = slot.start instanceof Date ? slot.start : new Date(slot.start);
        const endDate = slot.end instanceof Date ? slot.end : new Date(slot.end);

        const startTimeFormatted = formatTimeInTimeZone(startDate, slot.timezone);
        const endTimeFormatted = formatTimeInTimeZone(endDate, slot.timezone);

        const slotControl = this.createTimeSlotControl(
          slot.id,
          slot.notes || '',
          slot.timezone,
          slot.visibilityScope,
        );
        slotControl.patchValue({
          startTime: startTimeFormatted || '',
          endTime: endTimeFormatted || '',
          timezone: slot.timezone,
          visibilityScope: slot.visibilityScope,
          notes: slot.notes || '',
        });
        timeSlots.push(slotControl);
      }
    }
    // If no slots exist, leave the array empty (user can add manually)

    // Update form values
    this.createSlotForm.patchValue({
      date: dateValue,
    });

    // Mark form as untouched and pristine
    this.createSlotForm.markAsUntouched();
    this.createSlotForm.markAsPristine();
  }
}
