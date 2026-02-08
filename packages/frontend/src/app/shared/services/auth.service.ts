import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { RegisterDTO, LoginDTO, User, ChangePasswordDTO } from '@meetwithfriends/shared';
import { BehaviorSubject, Observable, finalize, of, shareReplay, tap } from 'rxjs';
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
  private readonly profileCacheTtlMs = 30000;
  private readonly profileCache = {
    user: null as User | null,
    expiresAt: 0,
    inFlight$: null as Observable<User> | null,
  };

  private currentUser = signal<User | null>(null);
  public currentUser$ = new BehaviorSubject<User | null>(null);
  public guardLoading = signal(false);

  register(input: RegisterDTO.Request): Observable<RegisterDTO.Response> {
    return this.http.post<RegisterDTO.Response>(`${this.apiUrl}/register`, input);
  }

  login(input: LoginDTO.Request): Observable<LoginDTO.Response> {
    return this.http.post<LoginDTO.Response>(`${this.apiUrl}/login`, input);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {});
  }

  getProfile(force = false): Observable<User> {
    const now = Date.now();
    if (!force && this.profileCache.user && now < this.profileCache.expiresAt) {
      this.currentUser.set(this.profileCache.user);
      this.currentUser$.next(this.profileCache.user);
      return of(this.profileCache.user);
    }

    if (!force && this.profileCache.inFlight$) {
      return this.profileCache.inFlight$;
    }

    const request$ = this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.currentUser$.next(user);
        this.profileCache.user = user;
        this.profileCache.expiresAt = Date.now() + this.profileCacheTtlMs;
      }),
      finalize(() => {
        this.profileCache.inFlight$ = null;
      }),
      shareReplay(1),
    );

    this.profileCache.inFlight$ = request$;
    return request$;
  }

  updateLanguage(language: string): Observable<{ language: string }> {
    return this.http.patch<{ language: string }>(`${this.apiUrl}/language`, { language });
  }

  updateProfile(input: any): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/profile`, input).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.currentUser$.next(user);
        this.profileCache.user = user;
        this.profileCache.expiresAt = Date.now() + this.profileCacheTtlMs;
      }),
    );
  }

  changePassword(input: ChangePasswordDTO.Request): Observable<ChangePasswordDTO.Response> {
    return this.http.patch<ChangePasswordDTO.Response>(`${this.apiUrl}/password`, input);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  clearAccessToken(): void {
    localStorage.removeItem('accessToken');
    this.currentUser.set(null);
    this.currentUser$.next(null);
    this.profileCache.user = null;
    this.profileCache.expiresAt = 0;
    this.profileCache.inFlight$ = null;
  }

  setGuardLoading(isLoading: boolean): void {
    this.guardLoading.set(isLoading);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
