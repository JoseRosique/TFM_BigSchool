import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type FriendStatus = 'online' | 'offline';

export interface FriendGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  group?: FriendGroup | null;
  status: FriendStatus;
  isBlocked: boolean;
  isPending: boolean;
  isFriend: boolean;
  relationshipStatus?: 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'BLOCKED' | null;
  sentByMe?: boolean;
  requestId?: string;
}

export interface FriendList {
  id: string;
  name: string;
  count: number;
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root',
})
export class FriendsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/friends`;

  getFriends(): Observable<Friend[]> {
    return this.http.get<Friend[]>(this.apiUrl);
  }

  getPendingRequests(): Observable<Friend[]> {
    return this.http.get<Friend[]>(`${this.apiUrl}/pending`);
  }

  getBlockedUsers(): Observable<Friend[]> {
    return this.http.get<Friend[]>(`${this.apiUrl}/blocked`);
  }

  searchUsers(query: string): Observable<Friend[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Friend[]>(`${this.apiUrl}/search`, { params });
  }

  getFriendLists(): Observable<FriendList[]> {
    return this.http.get<FriendList[]>(`${this.apiUrl}/lists`);
  }

  sendFriendRequest(userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/requests`, { userId });
  }

  acceptRequest(requestId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/requests/${requestId}/accept`, {});
  }

  declineRequest(requestId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/requests/${requestId}/decline`, {});
  }

  removeFriend(friendId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${friendId}`);
  }

  unblockUser(userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/blocked/${userId}/unblock`, {});
  }
}
