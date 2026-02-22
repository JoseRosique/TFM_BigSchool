import { ListReservationsDTO, Slot } from '@meetwithfriends/shared';

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface CalendarSlotUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string;
  profilePicture?: string;
  imageUrl?: string;
}

export interface CalendarSlot extends Slot {
  startDate: Date; // Local date for display
  endDate: Date; // Local date for display
  user?: CalendarSlotUser | null;
  owner?: CalendarSlotUser | null;
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
  reservedCount: number;
}
