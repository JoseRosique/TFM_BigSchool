import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SlotStatus, VisibilityScope } from '@meetwithfriends/shared';
import { ToastService } from '../../../shared/services/toast.service';

import {
  combineDateAndTimeInTimeZone,
  formatDateInputValue,
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
  processingSlotId = signal<string | null>(null);
  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  isDateLocked = signal(false);
  displayTimezone = this.facade.displayTimezone;
  currentUserId = this.facade.currentUserId;

  pendingDeleteSlot = signal<CalendarSlot | null>(null);

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
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    timezone: ['', Validators.required],
    visibilityScope: [VisibilityScope.FRIENDS, Validators.required],
    notes: [''],
  });

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
    this.resetCreateSlotForm(formatDateInputValue(new Date()));
    this.isDateLocked.set(false);
    this.showCreateModal.set(true);
  }

  openCreateModalForDayKey(dayKey: string): void {
    this.resetCreateSlotForm(dayKey);
    this.isDateLocked.set(true);
    this.showCreateModal.set(true);
  }

  updateSlotDate(dateValue: string | null): void {
    this.createSlotForm.patchValue({ date: dateValue ?? '' });
  }

  updateStartTime(value: string | null): void {
    this.createSlotForm.patchValue({ startTime: value ?? '' });
  }

  updateEndTime(value: string | null): void {
    this.createSlotForm.patchValue({ endTime: value ?? '' });
  }

  autoResizeNotes(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) return;
    const maxHeight = 240;
    target.style.height = 'auto';
    const next = Math.min(target.scrollHeight, maxHeight);
    target.style.height = `${next}px`;
    target.style.overflowY = target.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateSlot(): void {
    if (this.isCreating()) return;
    if (this.createSlotForm.invalid) {
      this.createSlotForm.markAllAsTouched();
      return;
    }

    const { date, startTime, endTime, timezone, visibilityScope, notes } =
      this.createSlotForm.value;

    const selectedTimezone = (timezone as string) || this.displayTimezone();
    const start = combineDateAndTimeInTimeZone(
      date as string,
      startTime as string,
      selectedTimezone,
    );
    const end = combineDateAndTimeInTimeZone(date as string, endTime as string, selectedTimezone);

    if (!start || !end || end <= start) {
      this.toastService.error('CALENDAR_PAGE.TOASTS.INVALID_RANGE');
      return;
    }

    this.isCreating.set(true);
    this.facade
      .createSlot({
        start: start.toISOString(),
        end: end.toISOString(),
        timezone: selectedTimezone,
        visibilityScope: visibilityScope as VisibilityScope,
        notes: (notes as string) || undefined,
      })
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.showCreateModal.set(false);
          this.toastService.success('CALENDAR_PAGE.TOASTS.CREATED');
          this.facade.loadSlots();
        },
        error: () => {
          this.isCreating.set(false);
          this.toastService.error('CALENDAR_PAGE.TOASTS.CREATE_ERROR');
        },
      });
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

  private resetCreateSlotForm(dateValue: string): void {
    this.createSlotForm.reset({
      date: dateValue,
      startTime: '09:00',
      endTime: '10:00',
      timezone: this.displayTimezone(),
      visibilityScope: VisibilityScope.FRIENDS,
      notes: '',
    });
  }
}
