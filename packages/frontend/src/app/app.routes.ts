import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
        pathMatch: 'full',
    },
    {
        path: 'users-test',
        loadComponent: () => import('./features/users-test/users-test.component').then((m) => m.UsersTestComponent),
    },
    {
        path: 'auth',
        children: [
            // TODO: Login, Register components
        ],
    },
    {
        path: 'dashboard',
        children: [
            // TODO: Dashboard, Slots, Reservations components
        ],
    },
];
