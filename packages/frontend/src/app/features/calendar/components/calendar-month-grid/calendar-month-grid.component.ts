import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarDayView, CalendarSlot } from '../../calendar.types';
import { CalendarDayCellComponent } from '../calendar-day-cell/calendar-day-cell.component';
import { SlotStatus } from '@meetwithfriends/shared';

type TimeRangeFormatter = (start: Date, end: Date, timeZone: string) => string;

@Component({
  selector: 'app-calendar-month-grid',
  standalone: true,
  imports: [CommonModule, CalendarDayCellComponent],
  templateUrl: './calendar-month-grid.component.html',
  styleUrl: './calendar-month-grid.component.scss',
})
export class CalendarMonthGridComponent {
  monthWeekdays = input<{ key: string; label: string }[]>([]);
  dayViews = input<CalendarDayView[]>([]);
  slotStatus = input<typeof SlotStatus>(SlotStatus);
  currentUserId = input<string | null>(null);
  processingSlotId = input<string | null>(null);
  formatTimeRange = input<TimeRangeFormatter>(() => '');
  isReadOnly = input<boolean>(false);

  createForDay = output<string>();
  openDayModal = output<string>();
  reserveSlot = output<CalendarSlot>();
  deleteSlot = output<CalendarSlot>();
  editSlot = output<CalendarSlot>();

  onCreateForDay(dayKey: string): void {
    this.createForDay.emit(dayKey);
  }

  onOpenDayModal(dayKey: string): void {
    this.openDayModal.emit(dayKey);
  }

  onReserveSlot(slot: CalendarSlot): void {
    this.reserveSlot.emit(slot);
  }

  onEditSlot(slot: CalendarSlot): void {
    this.editSlot.emit(slot);
  }

  onDeleteSlot(slot: CalendarSlot): void {
    this.deleteSlot.emit(slot);
  }
}
