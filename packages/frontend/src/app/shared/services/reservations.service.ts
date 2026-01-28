import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { Reservation, ReserveSlotDTO } from "@meetwithfriends/shared";

/**
 * Reservations Service - Angular
 * Gestiona operaciones de reservas
 */
@Injectable({
  providedIn: "root",
})
export class ReservationsService {
  private http = inject(HttpClient);
  private apiUrl = "http://localhost:3000/reservations";

  reserve(input: ReserveSlotDTO.Request): Observable<ReserveSlotDTO.Response> {
    return this.http.post<ReserveSlotDTO.Response>(this.apiUrl, input);
  }

  getReservation(reservationId: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${reservationId}`);
  }

  listMyReservations(): Observable<{ items: Reservation[]; total: number }> {
    return this.http.get<{ items: Reservation[]; total: number }>(
      `${this.apiUrl}/me`
    );
  }

  cancelReservation(reservationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${reservationId}`
    );
  }
}
