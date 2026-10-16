import { Routes } from '@angular/router';
import { entitlementGuard } from '@core/guards/entitlement.guard';

export const DONATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/stewardship-workspace-shell/stewardship-workspace-shell.component').then(
        (m) => m.StewardshipWorkspaceShellComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/donations-dashboard.component').then((m) => m.DonationsDashboardComponent),
      },
      {
        path: 'plans',
        loadComponent: () =>
          import('./pages/donations-plans.component').then((m) => m.DonationsPlansComponent),
        canActivate: [entitlementGuard],
        data: { feature: 'CONTRIBUTION_PLANS' },
      },
      {
        path: 'dues',
        loadComponent: () =>
          import('./pages/donations-dues.component').then((m) => m.DonationsDuesComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/donations-projects.component').then((m) => m.DonationsProjectsComponent),
      },
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./pages/donations-projects.component').then((m) => m.DonationsProjectsComponent),
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./pages/donations-campaigns.component').then((m) => m.DonationsCampaignsComponent),
      },
      {
        path: 'project-installments',
        loadComponent: () =>
          import('./pages/donations-project-installments.component').then(
            (m) => m.DonationsProjectInstallmentsComponent
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/donations-payments.component').then((m) => m.DonationsPaymentsComponent),
      },
      {
        path: 'collection-day',
        loadComponent: () =>
          import('./pages/collection-day.component').then((m) => m.CollectionDayComponent),
      },
      {
        path: 'today-collections',
        loadComponent: () =>
          import('./pages/today-collections.component').then((m) => m.TodaysCollectionsComponent),
      },
      {
        path: 'receipts',
        loadComponent: () =>
          import('./pages/donations-receipts.component').then((m) => m.DonationsReceiptsComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/donations-register.component').then((m) => m.DonationsRegisterComponent),
      },
      {
        path: 'donors',
        loadComponent: () =>
          import('./pages/donations-donors.component').then((m) => m.DonationsDonorsComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/donations-categories.component').then((m) => m.DonationsCategoriesComponent),
      },
      {
        path: 'recurring',
        loadComponent: () =>
          import('./pages/donations-recurring.component').then((m) => m.DonationsRecurringComponent),
      },
      {
        path: 'approvals',
        loadComponent: () =>
          import('./pages/donations-approvals.component').then((m) => m.DonationsApprovalsComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./pages/donations-history.component').then((m) => m.DonationsHistoryComponent),
        canActivate: [entitlementGuard],
        data: { feature: 'AUDIT_LOG' },
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/donations-reports.component').then((m) => m.DonationsReportsComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./pages/donations-expenses.component').then((m) => m.DonationsExpensesComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/donations-settings.component').then((m) => m.DonationsSettingsComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/donations-notifications.component').then(
            (m) => m.DonationsNotificationsComponent
          ),
      },
      {
        path: 'download-history',
        loadComponent: () =>
          import('./pages/donations-download-history.component').then(
            (m) => m.DonationsDownloadHistoryComponent
          ),
      },
    ],
  },
];
