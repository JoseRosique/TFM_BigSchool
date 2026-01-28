import { Routes } from "@angular/router";

export const APP_ROUTES: Routes = [
  {
    path: "",
    redirectTo: "users-test",
    pathMatch: "full",
  },
  {
    path: "users-test",
    loadComponent: () =>
      import("./features/users-test/users-test.component").then(
        (m) => m.UsersTestComponent
      ),
  },
  {
    path: "auth",
    children: [
      // TODO: Login, Register components
    ],
  },
  {
    path: "dashboard",
    children: [
      // TODO: Dashboard, Slots, Reservations components
    ],
  },
];
