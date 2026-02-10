import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ListReservationsDTO,
  ListSlotsDTO,
  ReservationStatus,
  Slot,
  SlotStatus,
  User,
  VisibilityScope,
} from '@meetwithfriends/shared';
import { AuthService } from '../../shared/services/auth.service';
import { ReservationsService } from '../../shared/services/reservations.service';
import { SlotsService } from '../../shared/services/slots.service';
import { ToastService } from '../../shared/services/toast.service';
import { DateOnlyPickerComponent } from '../../shared/components/date-time-picker/date-only-picker.component';

import {
  combineDateAndTime,
  formatDateInputValue,
} from '../../shared/components/date-time-picker/date-time-utils';
import { TimeRangePickerComponent } from '@/shared/components/date-time-picker/time-range-picker.component';

interface CalendarSlot extends Slot {
  startDate: Date;
  endDate: Date;
}

interface ReservationItem extends ListReservationsDTO.ResponseItem {
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DateOnlyPickerComponent,
    TimeRangePickerComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  private readonly slotsService = inject(SlotsService);
  private readonly reservationsService = inject(ReservationsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly slotStatus = SlotStatus;
  readonly visibilityScope = VisibilityScope;
  readonly maxItemsPerDay = 3;

  viewMode = signal<'mine' | 'explore'>('mine');
  viewDate = signal<Date>(this.getMonthStart(new Date()));
  slots = signal<CalendarSlot[]>([]);
  reservations = signal<ReservationItem[]>([]);
  isLoadingSlots = signal(false);
  isLoadingReservations = signal(false);
  isCreating = signal(false);
  processingSlotId = signal<string | null>(null);
  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  isDateLocked = signal(false);
  displayTimezone = signal('UTC');
  currentUserId = signal<string | null>(null);

  pendingDeleteSlot = signal<CalendarSlot | null>(null);

  @ViewChild(DateOnlyPickerComponent) datePicker?: DateOnlyPickerComponent;
  @ViewChild(TimeRangePickerComponent) timeRangePicker?: TimeRangePickerComponent;

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

  monthLabel = computed(() => {
    const current = this.getMonthAnchor(this.viewDate());
    const locale = this.translate.currentLang || 'en';
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: this.displayTimezone(),
    }).format(current);
  });

  monthWeekdays = computed(() => {
    const start = this.getMonthGridStart(this.viewDate());
    const labels: { key: string; label: string }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      labels.push({
        key: this.getDateKey(date, this.displayTimezone()),
        label: this.formatWeekday(date),
      });
    }
    return labels;
  });

  monthGrid = computed(() => {
    const start = this.getMonthGridStart(this.viewDate());
    const timezone = this.displayTimezone();
    const currentMonthKey = this.getMonthKey(this.getMonthAnchor(this.viewDate()), timezone);
    const grid: {
      date: Date;
      key: string;
      number: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];
    const todayKey = this.getDateKey(new Date(), timezone);
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = this.getDateKey(date, timezone);
      const monthKey = this.getMonthKey(date, timezone);
      grid.push({
        date,
        key,
        number: this.formatDayNumber(date),
        isCurrentMonth: monthKey === currentMonthKey,
        isToday: key === todayKey,
      });
    }
    return grid;
  });

  slotsByDay = computed(() => {
    const map = new Map<string, CalendarSlot[]>();
    const timezone = this.displayTimezone();
    for (const slot of this.slots()) {
      const key = this.getDateKey(slot.startDate, timezone);
      const bucket = map.get(key) ?? [];
      bucket.push(slot);
      map.set(key, bucket);
    }
    for (const [key, bucket] of map.entries()) {
      bucket.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      map.set(key, bucket);
    }
    return map;
  });

  reservationsByDay = computed(() => {
    const map = new Map<string, ReservationItem[]>();
    const timezone = this.displayTimezone();
    for (const reservation of this.reservations()) {
      const key = this.getDateKey(reservation.startDate, timezone);
      const bucket = map.get(key) ?? [];
      bucket.push(reservation);
      map.set(key, bucket);
    }
    return map;
  });

  ngOnInit(): void {
    const existing = this.authService.currentUser$.value;
    if (existing) {
      this.setUserContext(existing);
      this.reloadAll();
      return;
    }

    this.authService.getProfile().subscribe({
      next: (user) => {
        this.setUserContext(user);
        this.reloadAll();
      },
      error: () => {
        this.toastService.error('CALENDAR_PAGE.TOASTS.LOAD_ERROR');
      },
    });
  }

  setViewMode(mode: 'mine' | 'explore'): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.loadSlots();
  }

  goToToday(): void {
    this.viewDate.set(this.getMonthStart(new Date()));
    this.loadSlots();
  }

  navigateMonth(step: number): void {
    const next = new Date(this.viewDate());
    next.setMonth(next.getMonth() + step);
    this.viewDate.set(this.getMonthStart(next));
    this.loadSlots();
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
    this.datePicker?.close();
    this.timeRangePicker?.close();
    this.showCreateModal.set(false);
  }

  handleDatePickerOpen(isOpen: boolean): void {
    if (isOpen) {
      this.timeRangePicker?.close();
    }
  }

  handleTimePickerOpen(isOpen: boolean): void {
    if (isOpen) {
      this.datePicker?.close();
    }
  }

  handleModalClick(event: MouseEvent): void {
    event.stopPropagation();
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickedPicker = target.closest('.date-picker, .time-range');
    if (clickedPicker) return;
    this.datePicker?.close();
    this.timeRangePicker?.close();
  }

  submitCreateSlot(): void {
    if (this.createSlotForm.invalid) {
      this.createSlotForm.markAllAsTouched();
      return;
    }

    const { date, startTime, endTime, timezone, visibilityScope, notes } =
      this.createSlotForm.value;

    const start = combineDateAndTime(date as string, startTime as string);
    const end = combineDateAndTime(date as string, endTime as string);

    if (!start || !end || end <= start) {
      this.toastService.error('CALENDAR_PAGE.TOASTS.INVALID_RANGE');
      return;
    }

    this.isCreating.set(true);
    this.slotsService
      .createSlot({
        start: start.toISOString(),
        end: end.toISOString(),
        timezone: (timezone as string) || this.displayTimezone(),
        visibilityScope: visibilityScope as VisibilityScope,
        notes: (notes as string) || undefined,
      })
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.showCreateModal.set(false);
          this.toastService.success('CALENDAR_PAGE.TOASTS.CREATED');
          this.loadSlots();
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
    this.reservationsService.reserve({ slotId: slot.id }).subscribe({
      next: () => {
        this.processingSlotId.set(null);
        this.toastService.success('CALENDAR_PAGE.TOASTS.RESERVED');
        this.reloadAll();
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
    this.reservationsService.cancelReservation(reservationId).subscribe({
      next: () => {
        this.processingSlotId.set(null);
        this.toastService.success('CALENDAR_PAGE.TOASTS.RESERVATION_CANCELED');
        this.reloadAll();
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
    this.slotsService.deleteSlot(slot.id).subscribe({
      next: () => {
        this.processingSlotId.set(null);
        this.closeDeleteModal();
        this.toastService.success('CALENDAR_PAGE.TOASTS.SLOT_DELETED');
        this.loadSlots();
      },
      error: () => {
        this.processingSlotId.set(null);
        this.closeDeleteModal();
        this.toastService.error('CALENDAR_PAGE.TOASTS.SLOT_DELETE_ERROR');
      },
    });
  }

  slotsForDay(dayKey: string): CalendarSlot[] {
    return this.slotsByDay().get(dayKey) ?? [];
  }

  visibleSlotsForDay(dayKey: string): CalendarSlot[] {
    return this.slotsForDay(dayKey).slice(0, this.maxItemsPerDay);
  }

  moreSlotsCount(dayKey: string): number {
    const total = this.slotsForDay(dayKey).length;
    return total > this.maxItemsPerDay ? total - this.maxItemsPerDay : 0;
  }

  availableCount(dayKey: string): number {
    return this.slotsForDay(dayKey).filter((slot) => slot.status === SlotStatus.AVAILABLE).length;
  }

  confirmedCount(dayKey: string): number {
    const reservations = this.reservationsByDay().get(dayKey) ?? [];
    return reservations.filter((reservation) => reservation.status === ReservationStatus.CREATED)
      .length;
  }

  pendingCount(dayKey: string): number {
    const userId = this.currentUserId();
    if (!userId) return 0;
    return this.slotsForDay(dayKey).filter(
      (slot) => slot.status === SlotStatus.RESERVED && slot.ownerId === userId,
    ).length;
  }

  statusKey(status: SlotStatus): string {
    return `CALENDAR_PAGE.STATUS.${status.toUpperCase()}`;
  }

  visibilityKey(scope: VisibilityScope): string {
    return `CALENDAR_PAGE.VISIBILITY.${scope.toUpperCase()}`;
  }

  reservationStatusKey(status: string): string {
    return `CALENDAR_PAGE.RESERVATION_STATUS.${status.toUpperCase()}`;
  }

  isOwner(slot: CalendarSlot): boolean {
    return slot.ownerId === this.currentUserId();
  }

  private reloadAll(): void {
    this.loadSlots();
    this.loadReservations();
  }

  private loadSlots(): void {
    this.isLoadingSlots.set(true);
    const { start, end } = this.getMonthGridRange(this.viewDate());

    const query: ListSlotsDTO.Query = {
      from: start.toISOString(),
      to: end.toISOString(),
    };

    if (this.viewMode() === 'mine') {
      const userId = this.currentUserId();
      if (userId) {
        query.userId = userId;
      }
    } else {
      query.status = SlotStatus.AVAILABLE;
    }

    this.slotsService.listSlots(query).subscribe({
      next: (response) => {
        const items = response.items
          .filter((slot) => slot.status !== SlotStatus.CANCELED)
          .map((slot) => ({
            ...slot,
            startDate: new Date(slot.start),
            endDate: new Date(slot.end),
          }));
        this.slots.set(items);
        this.isLoadingSlots.set(false);
      },
      error: () => {
        this.isLoadingSlots.set(false);
        this.toastService.error('CALENDAR_PAGE.TOASTS.LOAD_ERROR');
      },
    });
  }

  private loadReservations(): void {
    this.isLoadingReservations.set(true);
    this.reservationsService.listMyReservations().subscribe({
      next: (response) => {
        const items = response.items.map((reservation) => ({
          ...reservation,
          startDate: new Date(reservation.slotStart),
          endDate: new Date(reservation.slotEnd),
        }));
        this.reservations.set(items);
        this.isLoadingReservations.set(false);
      },
      error: () => {
        this.isLoadingReservations.set(false);
        this.toastService.error('CALENDAR_PAGE.TOASTS.LOAD_ERROR');
      },
    });
  }

  private setUserContext(user: User): void {
    this.currentUserId.set(user.id);
    if (user.timezone) {
      this.displayTimezone.set(user.timezone);
    }
  }

  private getMonthStart(date: Date): Date {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getMonthGridStart(date: Date): Date {
    const monthStart = this.getMonthStart(date);
    return this.getWeekStart(monthStart);
  }

  private getMonthGridRange(date: Date): { start: Date; end: Date } {
    const start = this.getMonthGridStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 41);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private getMonthAnchor(date: Date): Date {
    const anchor = new Date(date);
    anchor.setDate(15);
    anchor.setHours(12, 0, 0, 0);
    return anchor;
  }

  private getMonthKey(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
    });
    return formatter.format(date);
  }

  private getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getDateKey(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  private formatWeekday(date: Date): string {
    const locale = this.translate.currentLang || 'en';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      timeZone: this.displayTimezone(),
    }).format(date);
  }

  private formatDayNumber(date: Date): string {
    const locale = this.translate.currentLang || 'en';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      timeZone: this.displayTimezone(),
    }).format(date);
  }

  formatTimeRange(start: Date, end: Date, timeZone: string): string {
    const locale = this.translate.currentLang || 'en';
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

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
