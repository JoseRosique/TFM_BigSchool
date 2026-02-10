import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Slot,
  OpenSlotDTO,
  ListSlotsDTO,
  SlotStatus,
  VisibilityScope,
} from '@meetwithfriends/shared';
import { environment } from '../../../environments/environment';

/**
 * Slots Service - Angular
 * Gestiona operaciones con franjas de disponibilidad
 */
@Injectable({
  providedIn: 'root',
})
export class SlotsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/slots`;

  createSlot(input: OpenSlotDTO.Request): Observable<OpenSlotDTO.Response> {
    return this.http.post<OpenSlotDTO.Response>(this.apiUrl, input);
  }

  getSlot(slotId: string): Observable<Slot> {
    return this.http.get<Slot>(`${this.apiUrl}/${slotId}`);
  }

  listSlots(query?: ListSlotsDTO.Query): Observable<ListSlotsDTO.Response> {
    return this.http.get<ListSlotsDTO.Response>(this.apiUrl, {
      params: query as any,
    });
  }

  updateSlot(slotId: string, input: UpdateSlotPayload): Observable<Slot> {
    return this.http.patch<Slot>(`${this.apiUrl}/${slotId}`, input);
  }

  deleteSlot(slotId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${slotId}`);
  }
}

type UpdateSlotPayload = Partial<OpenSlotDTO.Request> & {
  status?: SlotStatus;
  visibilityScope?: VisibilityScope;
};
