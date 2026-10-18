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
];
