import { Routes, Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { rbacGuard } from '@core/guards/rbac.guard';
import { tenantAdminGuard } from '@core/guards/tenant-admin.guard';
import { subscriptionViewGuard } from '@core/guards/subscription-view.guard';
import { entitlementGuard } from '@core/guards/entitlement.guard';
import { marketingSuperAdminGuard } from '@features/marketing-admin/guards/marketing-super-admin.guard';

function redirectLegacyRegisterQuery(route: ActivatedRouteSnapshot): boolean | UrlTree {
  const router = inject(Router);
  const qp = route.queryParams;
  if (qp['create'] || qp['edit']) {
    return router.createUrlTree(['/sacraments'], { queryParams: qp });
  }
  return true;
}

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'roles-permissions',
    canActivate: [rbacGuard, entitlementGuard],
    data: { feature: 'RBAC_BASIC' },
    loadComponent: () => import('./roles-permissions/roles-permissions.component').then(m => m.RolesPermissionsComponent)
  },
  {
    path: 'ecclesiastical',
    loadChildren: () => import('./ecclesiastical/ecclesiastical.routes').then(m => m.ECCLESIASTICAL_ROUTES)
  },
  {
    path: 'sacraments/view/:id',
    redirectTo: '/sacraments/view/:id',
    pathMatch: 'full',
  },
  {
    path: 'sacraments/migration',
    redirectTo: '/sacraments/migration',
    pathMatch: 'full',
  },
  {
    path: 'sacraments/holy-orders/create',
    redirectTo: '/sacraments/holy-orders/create',
    pathMatch: 'full',
  },
  {
    path: 'sacraments/create',
    redirectTo: '/sacraments/create',
    pathMatch: 'full',
  },
  {
    path: 'sacraments/edit/:id',
    redirectTo: '/sacraments/edit/:id',
    pathMatch: 'full',
  },
  {
    path: 'sacraments',
    canActivate: [redirectLegacyRegisterQuery],
    loadComponent: () =>
      import('./sacrament-settings/sacrament-settings.page').then((m) => m.SacramentSettingsPage),
  },
  {
    path: 'pope',
    loadComponent: () => import('./pope-settings/pope-settings.component').then(m => m.PopeSettingsComponent)
  },
  {
    path: 'subscription',
    canActivate: [tenantAdminGuard],
    loadChildren: () => import('@features/subscriptions/subscriptions.routes').then(m => m.SUBSCRIPTION_ADMIN_ROUTES)
  },
  {
    path: 'billing',
    canActivate: [marketingSuperAdminGuard],
    loadChildren: () =>
      import('@features/billing-settings/billing-settings.routes').then((m) => m.BILLING_SETTINGS_ROUTES),
  },
  {
    path: 'marketing-website/billing',
    redirectTo: 'billing',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/controls',
    redirectTo: 'billing/controls',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/promotions',
    redirectTo: 'billing/promotions',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/offline-claims',
    redirectTo: 'billing/offline-claims',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/transactions',
    redirectTo: 'billing/transactions',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/investigations',
    redirectTo: 'billing/investigations',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/audit',
    redirectTo: 'billing/audit',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/tenant-pricing',
    redirectTo: 'billing/tenant-pricing',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website/billing/tenant-agreements',
    redirectTo: 'billing/tenant-agreements',
    pathMatch: 'full',
  },
  {
    path: 'marketing-website',
    canActivate: [marketingSuperAdminGuard],
    loadChildren: () =>
      import('@features/marketing-admin/marketing-admin.routes').then((m) => m.MARKETING_ADMIN_ROUTES),
  },
  {
    path: 'my-subscription',
    canActivate: [subscriptionViewGuard],
    loadComponent: () => import('./my-subscription/my-subscription.component').then(m => m.MySubscriptionComponent)
  },
  {
    path: 'support-access',
    loadComponent: () =>
      import('./support-access-windows/support-access-windows.page').then(
        (m) => m.SupportAccessWindowsPage
      ),
  },
  {
    path: 'forgot-password-requests',
    loadComponent: () =>
      import('./forgot-password-requests/forgot-password-requests.page').then(
        (m) => m.ForgotPasswordRequestsPage
      ),
  },
  {
    path: 'data-export',
    canActivate: [entitlementGuard],
    data: { feature: 'IMPORT_EXPORT' },
    loadComponent: () =>
      import('./data-export/data-export.page').then((m) => m.DataExportPage),
  },
  {
    path: 'default-seeds',
    data: { breadcrumbLabel: 'Recommended defaults' },
    loadComponent: () =>
      import('./default-seeds/default-seeds.page').then((m) => m.DefaultSeedsPage),
  },
  {
    path: 'web-settings',
    loadChildren: () =>
      import('@features/web-settings/web-settings.routes').then((m) => m.WEB_SETTINGS_ROUTES),
  },
  {
    path: 'contact-enquiries',
    loadChildren: () =>
      import('@features/web-settings/web-settings.routes').then((m) => m.CONTACT_ENQUIRIES_ROUTES),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('../notifications/pages/notification-preferences.page').then(
        (m) => m.NotificationPreferencesPage
      ),
  },
];
