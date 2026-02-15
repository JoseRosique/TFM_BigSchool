import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Group, GroupMember } from '../models/group.model';

export interface CreateGroupPayload {
  name: string;
  description?: string;
  icon: string;
  color: string;
  memberIds?: string[];
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  addMemberIds?: string[];
  removeMemberIds?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/groups`;
  private readonly groupUpdated$ = new Subject<Group>();

  groups = signal<Group[]>([]);

  onGroupUpdated(): Observable<Group> {
    return this.groupUpdated$.asObservable();
  }

  loadGroups(search?: string): Observable<Group[]> {
    const params = search?.trim() ? new HttpParams().set('search', search.trim()) : undefined;
    return this.http
      .get<Group[]>(this.apiUrl, { params })
      .pipe(tap((groups) => this.groups.set(groups)));
  }

  searchGroups(term: string): Observable<Group[]> {
    const params = term?.trim() ? new HttpParams().set('term', term.trim()) : undefined;
    return this.http
      .get<Group[]>(`${this.apiUrl}/search`, { params })
      .pipe(tap((groups) => this.groups.set(groups)));
  }

  createGroup(payload: CreateGroupPayload): Observable<Group> {
    return this.http
      .post<Group>(this.apiUrl, payload)
      .pipe(tap((group) => this.groups.update((groups) => [group, ...groups])));
  }

  updateGroup(groupId: string, payload: UpdateGroupPayload): Observable<Group> {
    return this.http.patch<Group>(`${this.apiUrl}/${groupId}`, payload).pipe(
      tap((updated) => {
        this.groups.update((groups) =>
          groups.map((group) => (group.id === updated.id ? updated : group)),
        );
        // Notify listeners that a group has been updated (e.g., members changed)
        this.groupUpdated$.next(updated);
      }),
    );
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${groupId}`)
      .pipe(
        tap(() => this.groups.update((groups) => groups.filter((group) => group.id !== groupId))),
      );
  }

  getAvailableFriends(groupId: string, search?: string): Observable<GroupMember[]> {
    const params = search?.trim() ? new HttpParams().set('search', search.trim()) : undefined;
    return this.http.get<GroupMember[]>(`${this.apiUrl}/${groupId}/available-friends`, { params });
  }
}
