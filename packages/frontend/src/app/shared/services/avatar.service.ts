import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AvatarsResponse {
  avatars: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAvailableAvatars(): Observable<AvatarsResponse> {
    return this.http.get<AvatarsResponse>(`${this.apiUrl}/auth/avatars`);
  }
}
