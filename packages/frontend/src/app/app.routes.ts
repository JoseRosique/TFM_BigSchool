import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
    pathMatch: 'full',
  },
  {
    path: 'auth',
    children: [
      {
        path: 'signup',
        loadComponent: () =>
          import('./auth/pages/signup-page/signup-page.component').then(
            (m) => m.SignupPageComponent,
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/pages/login-page/login-page.component').then((m) => m.LoginPageComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./auth/pages/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'calendar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/calendar/pages/calendar-page.component').then(
        (m) => m.CalendarPageComponent,
      ),
  },
  {
    path: 'friends',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/friends/friends.component').then((m) => m.FriendsComponent),
  },
  {
    path: 'groups',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/groups.component').then((m) => m.GroupsComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'error',
    loadComponent: () => import('./features/error/error.component').then((m) => m.ErrorComponent),
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/access-denied/access-denied.component').then(
        (m) => m.AccessDeniedComponent,
      ),
  },
];
