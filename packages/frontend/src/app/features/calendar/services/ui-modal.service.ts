import { Injectable, signal } from '@angular/core';
import { CalendarSlot } from '../calendar.types';

export interface DayModalState {
  isOpen: boolean;
  dayKey: string;
  slots: CalendarSlot[];
  dateStr: string;
}

@Injectable({
  providedIn: 'root',
})
export class UiModalService {
  dayModalState = signal<DayModalState>({
    isOpen: false,
    dayKey: '',
    slots: [],
    dateStr: '',
  });

  openDayModal(dayKey: string, slots: CalendarSlot[], dateStr: string): void {
    this.dayModalState.set({
      isOpen: true,
      dayKey,
      slots,
      dateStr,
    });
  }

  closeDayModal(): void {
    this.dayModalState.set({
      isOpen: false,
      dayKey: '',
      slots: [],
      dateStr: '',
    });
  }
}
