import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReservationItem } from '../../calendar.types';

type TimeRangeFormatter = (start: Date, end: Date, timeZone: string) => string;

type ReservationStatusKey = (status: string) => string;

@Component({
  selector: 'app-reservations-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './reservations-panel.component.html',
  styleUrl: './reservations-panel.component.scss',
})
export class ReservationsPanelComponent {
  reservations = input<ReservationItem[]>([]);
  isLoading = input<boolean>(false);
  processingSlotId = input<string | null>(null);
  formatTimeRange = input<TimeRangeFormatter>(() => '');
  reservationStatusKey = input<ReservationStatusKey>(() => '');

  cancelReservation = output<string>();

  onCancel(reservationId: string): void {
    this.cancelReservation.emit(reservationId);
  }
}
