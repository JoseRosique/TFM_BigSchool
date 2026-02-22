import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReservationItem } from '../../calendar.types';

type TimeRangeFormatter = (start: Date, end: Date, timeZone: string) => string;

@Component({
  selector: 'app-received-reservations',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './received-reservations-panel.component.html',
  styleUrl: './received-reservations-panel.component.scss',
})
export class ReceivedReservationsComponent {
  private readonly translate = inject(TranslateService);

  reservations = input<ReservationItem[]>([]);
  isLoading = input<boolean>(false);
  formatTimeRange = input<TimeRangeFormatter>(() => '');

  openDetail = output<ReservationItem>();

  orderedReservations = computed(() =>
    [...this.reservations()].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
  );

  onOpenDetail(reservation: ReservationItem): void {
    this.openDetail.emit(reservation);
  }

  onOpenDetailFromKeyboard(event: KeyboardEvent, reservation: ReservationItem): void {
    event.preventDefault();
    this.onOpenDetail(reservation);
  }

  reservedByFullName(reservation: ReservationItem): string {
    const firstName = reservation.reservedBy?.firstName?.trim() || '';
    const lastName = reservation.reservedBy?.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;
    if (reservation.reservedBy?.name) return reservation.reservedBy.name;
    if (reservation.reserverName) return reservation.reserverName;
    if (reservation.reserverNickname) return reservation.reserverNickname;
    return 'Unknown';
  }

  currentLocale(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  formatDateLabel(date: Date, timeZone: string): string {
    const locale = this.currentLocale();
    const formatted = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone,
    }).format(date);

    if (!formatted) return '';
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}
