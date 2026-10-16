import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

type BillingCardIcon =
  | 'sliders'
  | 'tag'
  | 'scale'
  | 'file'
  | 'list'
  | 'inbox'
  | 'search'
  | 'clipboard'
  | 'calendar'
  | 'globe';

interface BillingSettingsCard {
  title: string;
  description: string;
  route: string;
  icon: BillingCardIcon;
}

@Component({
  selector: 'app-billing-settings-hub',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, RouterLink],
  templateUrl: './billing-settings-hub.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './billing-settings-hub.page.scss',
})
export class BillingSettingsHubPage {
  readonly sections: BillingSettingsCard[] = [
    {
      title: 'Payment settings',
      description: 'Global switches, Razorpay gateways, and offline payment methods',
      route: '/settings/billing/controls',
      icon: 'sliders',
    },
    {
      title: 'Promotions & discounts',
      description: 'Create and activate commercial offers for SaaS checkout',
      route: '/settings/billing/promotions',
      icon: 'tag',
    },
    {
      title: 'Tenant pricing',
      description: 'Negotiated list prices per church',
      route: '/settings/billing/tenant-pricing',
      icon: 'scale',
    },
    {
      title: 'Billing agreements',
      description: 'Installment terms and partial-payment entitlement rules',
      route: '/settings/billing/tenant-agreements',
      icon: 'file',
    },
    {
      title: 'Transactions',
      description: 'Orders, payment attempts, refunds, and reconciliation',
      route: '/settings/billing/transactions',
      icon: 'list',
    },
    {
      title: 'Offline claims',
      description: 'Review and approve tenant payment claims',
      route: '/settings/billing/offline-claims',
      icon: 'inbox',
    },
    {
      title: 'Investigations',
      description: 'Payment mismatches requiring manual review',
      route: '/settings/billing/investigations',
      icon: 'search',
    },
    {
      title: 'Billing audit',
      description: 'Commercial and payment control change history',
      route: '/settings/billing/audit',
      icon: 'clipboard',
    },
  ];

  readonly relatedLinks: BillingSettingsCard[] = [
    {
      title: 'Subscription catalog',
      description: 'Plans, features, limits, and access settings for churches',
      route: '/settings/subscription/plans',
      icon: 'calendar',
    },
    {
      title: 'Website subscription plans',
      description: 'Preview and publish how plans appear on the marketing website',
      route: '/settings/marketing-website/plans',
      icon: 'globe',
    },
  ];

}
