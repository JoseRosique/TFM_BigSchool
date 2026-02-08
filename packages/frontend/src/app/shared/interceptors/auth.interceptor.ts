import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Auth HTTP Interceptor
 * Añade JWT token a todas las requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/assets/i18n/')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error?.status === 401 && !req.url.includes('/auth/login')) {
        authService.clearAccessToken();
        router.navigate(['/auth/login']);
      } else if (error?.status === 403) {
        router.navigate(['/access-denied']);
      }
      return throwError(() => error);
    }),
  );
};
