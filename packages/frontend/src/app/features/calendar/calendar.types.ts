import { ListReservationsDTO, Slot } from '@meetwithfriends/shared';

export interface CalendarSlot extends Slot {
  startDate: Date;
  endDate: Date;
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
