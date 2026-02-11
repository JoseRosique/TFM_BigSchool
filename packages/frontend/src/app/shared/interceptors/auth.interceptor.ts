import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

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
  const translate = inject(TranslateService);
  const toastService = inject(ToastService);
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
      if (error?.status === 429) {
        toastService.warning(translate.instant('ERRORS.TOO_MANY_REQUESTS'));
      }

      const isRefreshRequest = req.url.includes('/auth/refresh');
      const isLoginRequest = req.url.includes('/auth/login');
      const alreadyRetried = req.headers.has('x-refresh-attempt');

      if (error?.status === 401 && !isLoginRequest && !isRefreshRequest && !alreadyRetried) {
        return authService.refreshAccessToken().pipe(
          switchMap((newAccessToken) => {
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`,
                'x-refresh-attempt': '1',
              },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            if (refreshError?.status === 401) {
              authService.clearTokens();
              toastService.info(translate.instant('ERRORS.SESSION_EXPIRED'));
              router.navigate(['/auth/login']);
            }
            return throwError(() => refreshError);
          }),
        );
      }

      if (error?.status === 401 && !isLoginRequest) {
        authService.clearTokens();
        toastService.info(translate.instant('ERRORS.SESSION_EXPIRED'));
        router.navigate(['/auth/login']);
      } else if (error?.status === 403) {
        router.navigate(['/access-denied']);
      }
      return throwError(() => error);
    }),
  );
};
