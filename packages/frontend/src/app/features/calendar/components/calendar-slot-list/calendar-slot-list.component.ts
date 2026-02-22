import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SlotStatus } from '@meetwithfriends/shared';
import { CalendarSlot } from '../../calendar.types';

type TimeRangeFormatter = (start: Date, end: Date, timeZone: string) => string;

@Component({
  selector: 'app-calendar-slot-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './calendar-slot-list.component.html',
  styleUrl: './calendar-slot-list.component.scss',
})
export class CalendarSlotListComponent {
  slots = input<CalendarSlot[]>([]);
  moreCount = input<number>(0);
  slotStatus = input<typeof SlotStatus>(SlotStatus);
  currentUserId = input<string | null>(null);
  processingSlotId = input<string | null>(null);
  formatTimeRange = input<TimeRangeFormatter>((start: Date, end: Date, timeZone: string) => '');
  isReadOnly = input<boolean>(false);

  reserveSlot = output<CalendarSlot>();
  deleteSlot = output<CalendarSlot>();
  editSlot = output<CalendarSlot>();
  showMore = output<void>();

  onShowMore(event: Event): void {
    event.stopPropagation();
    this.showMore.emit();
  }

  onReserve(slot: CalendarSlot, event: MouseEvent): void {
    event.stopPropagation();
    this.reserveSlot.emit(slot);
  }

  onEdit(slot: CalendarSlot, event: MouseEvent): void {
    event.stopPropagation();
    this.editSlot.emit(slot);
  }

  onDelete(slot: CalendarSlot, event: MouseEvent): void {
    event.stopPropagation();
    this.deleteSlot.emit(slot);
  }

  onSlotClick(slot: CalendarSlot, event: MouseEvent): void {
    event.stopPropagation();

    if (this.isReadOnly()) {
      this.editSlot.emit(slot);
      return;
    }

    if (this.isOwner(slot)) {
      this.editSlot.emit(slot);
    }
  }

  isOwner(slot: CalendarSlot): boolean {
    return slot.ownerId === this.currentUserId();
  }

  visibleSlots(): CalendarSlot[] {
    if (this.isReadOnly()) {
      return this.slots();
    }

    return this.slots().filter((slot) => slot.status !== this.slotStatus().RESERVED);
  }

  formatSlotRange(slot: CalendarSlot): string {
    return this.formatTimeRange()(slot.startDate, slot.endDate, slot.timezone);
  }
}
