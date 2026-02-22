import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reservation, ReserveSlotDTO, ListReservationsDTO } from '@meetwithfriends/shared';
import { environment } from '../../../../environments/environment';

/**
 * Reservations Service - Angular
 * Gestiona operaciones de reservas con patrón Observer
 */
@Injectable({
  providedIn: 'root',
})
export class ReservationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reservations`;

  /**
   * Subject que emite eventos cuando se actualiza una reserva
   * Permite actualización reactiva de la UI sin recargar la página
   */
  private reservationUpdatedSubject = new Subject<void>();

  /**
   * Observable público para que los componentes se suscriban
   */
  readonly reservationUpdated$ = this.reservationUpdatedSubject.asObservable();

  reserveBySlotId(slotId: string): Observable<ReserveSlotDTO.Response> {
    return this.http.post<ReserveSlotDTO.Response>(this.apiUrl, { slotId }).pipe(
      tap(() => {
        // Emitir evento de actualización solo cuando la API responde exitosamente
        this.reservationUpdatedSubject.next();
      }),
    );
  }

  reserve(input: ReserveSlotDTO.Request): Observable<ReserveSlotDTO.Response> {
    return this.http.post<ReserveSlotDTO.Response>(this.apiUrl, input).pipe(
      tap(() => {
        // Emitir evento de actualización solo cuando la API responde exitosamente
        this.reservationUpdatedSubject.next();
      }),
    );
  }

  getReservation(reservationId: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${reservationId}`);
  }

  listMyReservations(): Observable<ListReservationsDTO.Response> {
    return this.http.get<ListReservationsDTO.Response>(`${this.apiUrl}/me`);
  }

  listReservations(
    type: ListReservationsDTO.QueryType = 'mine',
  ): Observable<ListReservationsDTO.Response> {
    return this.http.get<ListReservationsDTO.Response>(`${this.apiUrl}/me`, {
      params: { type },
    });
  }

  cancelReservation(reservationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${reservationId}`).pipe(
      tap(() => {
        // Emitir evento de actualización solo cuando la API responde exitosamente
        this.reservationUpdatedSubject.next();
      }),
    );
  }
}
