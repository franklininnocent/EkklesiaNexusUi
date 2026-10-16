import { Routes } from '@angular/router';

/** Platform SaaS billing workspace (Super Admin). Page components live under marketing-admin. */
export const BILLING_SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/billing-settings-hub.page').then((m) => m.BillingSettingsHubPage),
  },
  {
    path: 'controls',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-controls/billing-controls.page').then((m) => m.BillingControlsPage),
  },
  {
    path: 'promotions',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-promotions/billing-promotions.page').then((m) => m.BillingPromotionsPage),
  },
  {
    path: 'offline-claims',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-offline-claims/billing-offline-claims.page').then(
        (m) => m.BillingOfflineClaimsPage,
      ),
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-transactions/billing-transactions.page').then(
        (m) => m.BillingTransactionsPage,
      ),
  },
  {
    path: 'investigations',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-investigations/billing-investigations.page').then(
        (m) => m.BillingInvestigationsPage,
      ),
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-audit/billing-audit.page').then((m) => m.BillingAuditPage),
  },
  {
    path: 'tenant-pricing',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-tenant-pricing/billing-tenant-pricing.page').then(
        (m) => m.BillingTenantPricingPage,
      ),
  },
  {
    path: 'tenant-agreements',
    loadComponent: () =>
      import('../marketing-admin/pages/billing-tenant-agreements/billing-tenant-agreements.page').then(
        (m) => m.BillingTenantAgreementsPage,
      ),
  },
];
