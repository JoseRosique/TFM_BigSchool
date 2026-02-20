import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SlotStatus } from '@meetwithfriends/shared';
import { CalendarSlot } from '../../calendar.types';
import { CalendarSlotListComponent } from '../calendar-slot-list/calendar-slot-list.component';

type TimeRangeFormatter = (start: Date, end: Date, timeZone: string) => string;

type CalendarDay = {
  date: Date;
  key: string;
  number: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

@Component({
  selector: 'app-calendar-day-cell',
  standalone: true,
  imports: [CommonModule, TranslateModule, CalendarSlotListComponent],
  templateUrl: './calendar-day-cell.component.html',
  styleUrl: './calendar-day-cell.component.scss',
})
export class CalendarDayCellComponent {
  day = input<CalendarDay | null>(null);
  slots = input<CalendarSlot[]>([]);
  moreCount = input<number>(0);
  availableCount = input<number>(0);
  confirmedCount = input<number>(0);
  pendingCount = input<number>(0);
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

  onCellClick(): void {
    const day = this.day();
    if (!day) return;

    // En modo read-only (explorar), abrir detalle directo de la primera franja de amigo
    if (this.isReadOnly()) {
      const friendSlot = this.slots().find((slot) => slot.ownerId !== this.currentUserId());
      if (friendSlot) {
        this.editSlot.emit(friendSlot);
      }
    } else {
      // En modo normal (mi disponibilidad), permitir crear
      this.createForDay.emit(day.key);
    }
  }

  onCreateClick(event: MouseEvent): void {
    event.stopPropagation();
    const day = this.day();
    if (!day) return;
    this.createForDay.emit(day.key);
  }

  onReserve(slot: CalendarSlot): void {
    this.reserveSlot.emit(slot);
  }

  onEdit(slot: CalendarSlot): void {
    this.editSlot.emit(slot);
  }

  onDelete(slot: CalendarSlot): void {
    this.deleteSlot.emit(slot);
  }
}
