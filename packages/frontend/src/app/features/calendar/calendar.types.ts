import { ListReservationsDTO, Slot } from '@meetwithfriends/shared';

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface CalendarSlot extends Slot {
  startDate: Date; // Local date for display
  endDate: Date; // Local date for display
}

export interface ReservationItem extends ListReservationsDTO.ResponseItem {
  startDate: Date;
  endDate: Date;
}

export interface CalendarDayView {
  day: {
    date: Date;
    key: string;
    number: string;
    isCurrentMonth: boolean;
    isToday: boolean;
  };
  slots: CalendarSlot[];
  moreCount: number;
  availableCount: number;
  confirmedCount: number;
  pendingCount: number;
}
