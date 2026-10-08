import { Routes } from '@angular/router';

export const CHURCH_PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./church-profile.component').then((m) => m.ChurchProfileComponent),
  },
];
