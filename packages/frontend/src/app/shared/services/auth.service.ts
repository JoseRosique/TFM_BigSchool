import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { signal } from "@angular/core";
import { RegisterDTO, LoginDTO, User } from "@meetwithfriends/shared";
import { BehaviorSubject, Observable } from "rxjs";

/**
 * Auth Service - Angular
 * Maneja estado de autenticación y comunicación con backend
 */
@Injectable({
  providedIn: "root",
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = "http://localhost:3000/auth";

  private currentUser = signal<User | null>(null);
  public currentUser$ = new BehaviorSubject<User | null>(null);

  register(input: RegisterDTO.Request): Observable<RegisterDTO.Response> {
    return this.http.post<RegisterDTO.Response>(
      `${this.apiUrl}/register`,
      input
    );
  }

  login(input: LoginDTO.Request): Observable<LoginDTO.Response> {
    return this.http.post<LoginDTO.Response>(`${this.apiUrl}/login`, input);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {});
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  getAccessToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  setAccessToken(token: string): void {
    localStorage.setItem("accessToken", token);
  }

  clearAccessToken(): void {
    localStorage.removeItem("accessToken");
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
