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

  if (authService.currentUser$.value) {
    return true;
  }

  authService.setGuardLoading(true);

  return authService.getProfile().pipe(
    map(() => true),
    catchError((error) => {
      if (error?.status === 401 || error?.status === 403) {
        authService.clearAccessToken();
        return of(router.createUrlTree(['/auth/login']));
      }
      console.error('Auth guard profile validation failed', error);
      return of(router.createUrlTree(['/error']));
    }),
    finalize(() => {
      authService.setGuardLoading(false);
    }),
  );
};
