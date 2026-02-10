import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reservation, ReserveSlotDTO, ListReservationsDTO } from '@meetwithfriends/shared';
import { environment } from '../../../environments/environment';

/**
 * Reservations Service - Angular
 * Gestiona operaciones de reservas
 */
@Injectable({
  providedIn: 'root',
})
export class ReservationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reservations`;

  reserve(input: ReserveSlotDTO.Request): Observable<ReserveSlotDTO.Response> {
    return this.http.post<ReserveSlotDTO.Response>(this.apiUrl, input);
  }

  getReservation(reservationId: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${reservationId}`);
  }

  listMyReservations(): Observable<ListReservationsDTO.Response> {
    return this.http.get<ListReservationsDTO.Response>(`${this.apiUrl}/me`);
  }

  cancelReservation(reservationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${reservationId}`);
  }
}
