import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarSlot, CalendarSlotUser } from '../../calendar.types';

type TimeRangeFormatter = (start: Date, end: Date, timeZone: string) => string;

@Component({
  selector: 'app-explore-day-slots-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './explore-day-slots-modal.component.html',
  styleUrl: './explore-day-slots-modal.component.scss',
})
export class ExploreDaySlotsModalComponent {
  slots = input<CalendarSlot[]>([]);
  dayLabel = input<string>('');
  formatTimeRange = input<TimeRangeFormatter>(() => '');

  close = output<void>();
  selectSlot = output<CalendarSlot>();

  onOverlayClick(): void {
    this.close.emit();
  }

  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onClose(): void {
    this.close.emit();
  }

  onSelectSlot(slot: CalendarSlot): void {
    this.selectSlot.emit(slot);
  }

  getHostName(slot: CalendarSlot): string {
    const userInfo = slot.user ?? slot.owner;
    return this.getUserDisplayName(userInfo) || slot.ownerId;
  }

  getHostAvatar(slot: CalendarSlot): string | null {
    const userInfo = slot.user ?? slot.owner;
    return (
      userInfo?.avatarUrl ||
      userInfo?.avatar ||
      userInfo?.profilePicture ||
      userInfo?.imageUrl ||
      null
    );
  }

  getHostInitials(slot: CalendarSlot): string {
    const userInfo = slot.user ?? slot.owner;
    const firstName = userInfo?.firstName?.trim() || '';
    const lastName = userInfo?.lastName?.trim() || '';

    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    const fallback = this.getUserDisplayName(userInfo);
    if (fallback) {
      return fallback.slice(0, 2).toUpperCase();
    }

    return '??';
  }

  private getUserDisplayName(userInfo?: CalendarSlotUser | null): string {
    if (!userInfo) return '';

    const firstName = userInfo.firstName?.trim() || '';
    const lastName = userInfo.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;
    if (userInfo.name) return userInfo.name;
    if (userInfo.nickname) return userInfo.nickname;

    return '';
  }
}
