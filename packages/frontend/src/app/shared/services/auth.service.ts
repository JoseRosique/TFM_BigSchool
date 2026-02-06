import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { RegisterDTO, LoginDTO, User } from '@meetwithfriends/shared';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Auth Service - Angular
 * Maneja estado de autenticación y comunicación con backend
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private currentUser = signal<User | null>(null);
  public currentUser$ = new BehaviorSubject<User | null>(null);

  register(input: RegisterDTO.Request): Observable<RegisterDTO.Response> {
    return this.http.post<RegisterDTO.Response>(`${this.apiUrl}/register`, input);
  }

  login(input: LoginDTO.Request): Observable<LoginDTO.Response> {
    return this.http.post<LoginDTO.Response>(`${this.apiUrl}/login`, input);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {});
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.currentUser$.next(user);
      }),
    );
  }

  updateLanguage(language: string): Observable<{ language: string }> {
    return this.http.patch<{ language: string }>(`${this.apiUrl}/language`, { language });
  }

  updateProfile(input: any): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/profile`, input).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.currentUser$.next(user);
      }),
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  clearAccessToken(): void {
    localStorage.removeItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
