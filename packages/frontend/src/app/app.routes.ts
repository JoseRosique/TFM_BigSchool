import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
    pathMatch: 'full',
  },
  {
    path: 'users-test',
    loadComponent: () =>
      import('./features/users-test/users-test.component').then((m) => m.UsersTestComponent),
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
    ],
  },
  {
    path: 'dashboard',
    children: [
      // TODO: Dashboard, Slots, Reservations components
    ],
  },
];
