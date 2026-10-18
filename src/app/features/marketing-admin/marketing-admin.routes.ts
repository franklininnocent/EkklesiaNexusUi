import { Routes } from '@angular/router';

export const MARKETING_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/marketing-content-publish/marketing-content-publish.page').then(
        (m) => m.MarketingContentPublishPage,
      ),
  },
  {
    path: 'plans',
    loadComponent: () =>
      import('./pages/marketing-plan-catalog-publish/marketing-plan-catalog-publish.page').then(
        (m) => m.MarketingPlanCatalogPublishPage,
      ),
  },
  {
    path: 'seo-monitoring',
    loadComponent: () =>
      import('./pages/marketing-seo-monitoring-runbook/marketing-seo-monitoring-runbook.page').then(
        (m) => m.MarketingSeoMonitoringRunbookPage,
      ),
  },
  { path: 'billing', redirectTo: '/settings/billing', pathMatch: 'full' },
  { path: 'billing/controls', redirectTo: '/settings/billing/controls', pathMatch: 'full' },
  { path: 'billing/promotions', redirectTo: '/settings/billing/promotions', pathMatch: 'full' },
  { path: 'billing/offline-claims', redirectTo: '/settings/billing/offline-claims', pathMatch: 'full' },
  { path: 'billing/transactions', redirectTo: '/settings/billing/transactions', pathMatch: 'full' },
  { path: 'billing/investigations', redirectTo: '/settings/billing/investigations', pathMatch: 'full' },
  { path: 'billing/audit', redirectTo: '/settings/billing/audit', pathMatch: 'full' },
  { path: 'billing/tenant-pricing', redirectTo: '/settings/billing/tenant-pricing', pathMatch: 'full' },
  { path: 'billing/tenant-agreements', redirectTo: '/settings/billing/tenant-agreements', pathMatch: 'full' },
];
