import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-billing-admin-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="cf-panel marketing-website__section-tabs billing-workspace__nav" aria-label="Billing administration">
      <a routerLink="/settings/marketing-website/plans" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Website plans</a>
      <a routerLink="/settings/subscription/plans" class="cf-btn cf-btn-sm">Catalog plans</a>
      <a routerLink="/settings/billing" routerLinkActive="cf-btn-primary" [routerLinkActiveOptions]="{ exact: true }" class="cf-btn cf-btn-sm">Overview</a>
      <a routerLink="/settings/billing/controls" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Payment settings</a>
      <a routerLink="/settings/billing/promotions" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Promotions</a>
      <a routerLink="/settings/billing/tenant-pricing" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Tenant pricing</a>
      <a routerLink="/settings/billing/tenant-agreements" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Agreements</a>
      <a routerLink="/settings/billing/transactions" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Transactions</a>
      <a routerLink="/settings/billing/offline-claims" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Offline claims</a>
      <a routerLink="/settings/billing/investigations" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Investigations</a>
      <a routerLink="/settings/billing/audit" routerLinkActive="cf-btn-primary" class="cf-btn cf-btn-sm">Audit</a>
    </nav>
  `,
})
export class BillingAdminNavComponent {}
