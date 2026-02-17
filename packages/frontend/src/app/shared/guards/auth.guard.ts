import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, finalize, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const cachedUser = authService.currentUser$.value;
  // Si el usuario existe pero falta el nickname, intenta recuperarlo del payload JWT
  if (cachedUser && (!('nickname' in cachedUser) || !cachedUser.nickname)) {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Decodifica JWT: convierte base64url a base64 estándar
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.nickname && !cachedUser.nickname) {
          cachedUser.nickname = payload.nickname;
          authService.currentUser$.next(cachedUser);
        }
      } catch (e) {
        console.warn('Error al obtener nickname del JWT:', e);
      }
    }
  }

  if (authService.currentUser$.value) {
    return true;
  }

  authService.setGuardLoading(true);

  return authService.getProfile().pipe(
    map(() => true),
    catchError((error) => {
      if (error?.status === 401) {
        authService.clearAccessToken();
        return of(router.createUrlTree(['/auth/login']));
      }
      if (error?.status === 403) {
        return of(router.createUrlTree(['/access-denied']));
      }
      console.error('Auth guard profile validation failed', error);
      return of(router.createUrlTree(['/error']));
    }),
    finalize(() => {
      authService.setGuardLoading(false);
    }),
  );
};
