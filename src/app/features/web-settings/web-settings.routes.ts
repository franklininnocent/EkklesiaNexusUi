import { Routes } from '@angular/router';
import { contactEnquiriesGuard, webSettingsGuard } from './guards/web-settings.guard';

export const WEB_SETTINGS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [webSettingsGuard],
    loadComponent: () => import('./pages/web-settings.page').then((m) => m.WebSettingsPage),
  },
];

export const CONTACT_ENQUIRIES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [contactEnquiriesGuard],
    loadComponent: () =>
      import('./pages/contact-enquiries.page').then((m) => m.ContactEnquiriesPage),
  },
];
