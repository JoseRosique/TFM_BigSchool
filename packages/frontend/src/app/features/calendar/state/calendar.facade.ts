import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  ListSlotsDTO,
  OpenSlotDTO,
  ReservationStatus,
  SlotStatus,
  User,
} from '@meetwithfriends/shared';
import { AuthService } from '../../../shared/services/auth.service';
import { ReservationsService } from '../../../shared/services/reservations.service';
import { SlotsService } from '../../../shared/services/slots.service';
import { CalendarDayView, CalendarSlot, ReservationItem } from '../calendar.types';

@Injectable({
  providedIn: 'root',
})
export class CalendarFacade {
  private readonly slotsService = inject(SlotsService);
  private readonly reservationsService = inject(ReservationsService);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly maxItemsPerDay = 3;

  viewMode = signal<'mine' | 'explore'>('mine');
  viewDate = signal<Date>(this.getMonthStart(new Date()));
  slots = signal<CalendarSlot[]>([]);
  reservations = signal<ReservationItem[]>([]);
  isLoadingSlots = signal(false);
  isLoadingReservations = signal(false);
  displayTimezone = signal('UTC');
  currentUserId = signal<string | null>(null);

  slotsErrorKey = signal<string | null>(null);
  reservationsErrorKey = signal<string | null>(null);
  profileErrorKey = signal<string | null>(null);

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
    const grid: CalendarDayView['day'][] = [];
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

  monthDayViews = computed(() =>
    this.monthGrid().map((day) => ({
      day,
      slots: this.visibleSlotsForDay(day.key),
      moreCount: this.moreSlotsCount(day.key),
      availableCount: this.availableCount(day.key),
      confirmedCount: this.confirmedCount(day.key),
      pendingCount: this.pendingCount(day.key),
    })),
  );

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

  init(): void {
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
        this.profileErrorKey.set('CALENDAR_PAGE.TOASTS.LOAD_ERROR');
      },
    });
  }

  clearSlotsError(): void {
    this.slotsErrorKey.set(null);
  }

  clearReservationsError(): void {
    this.reservationsErrorKey.set(null);
  }

  clearProfileError(): void {
    this.profileErrorKey.set(null);
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

  reloadAll(): void {
    this.loadSlots();
    this.loadReservations();
  }

  loadSlots(): void {
    this.isLoadingSlots.set(true);
    const { start, end } = this.getMonthGridRange(this.viewDate());

    const query: ListSlotsDTO.Query = {
      from: start.toISOString(),
      to: end.toISOString(),
    };

    if (this.viewMode() === 'mine') {
      const userId = this.currentUserId();
      if (!userId) {
        this.isLoadingSlots.set(false);
        return;
      }
      query.userId = userId;
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
        this.slotsErrorKey.set('CALENDAR_PAGE.TOASTS.LOAD_ERROR');
      },
    });
  }

  loadReservations(): void {
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
        this.reservationsErrorKey.set('CALENDAR_PAGE.TOASTS.LOAD_ERROR');
      },
    });
  }

  createSlot(input: OpenSlotDTO.Request) {
    return this.slotsService.createSlot(input);
  }

  reserveSlot(slotId: string) {
    return this.reservationsService.reserve({ slotId });
  }

  cancelReservation(reservationId: string) {
    return this.reservationsService.cancelReservation(reservationId);
  }

  deleteSlot(slotId: string) {
    return this.slotsService.deleteSlot(slotId);
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

  isOwner(slot: CalendarSlot): boolean {
    return slot.ownerId === this.currentUserId();
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
}
