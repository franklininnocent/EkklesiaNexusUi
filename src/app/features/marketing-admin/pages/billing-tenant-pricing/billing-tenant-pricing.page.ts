import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { BillingTenantPickerComponent, BillingTenantSelection } from '../../components/billing-tenant-picker/billing-tenant-picker.component';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { SubscriptionAdminService } from '@features/subscriptions/services/subscription-admin.service';
import { BillingAdminService } from '../../services/billing-admin.service';

@Component({
  selector: 'app-billing-tenant-pricing-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    BillingAdminNavComponent,
    ModalShellComponent,
    BillingTenantPickerComponent,
  ],
  templateUrl: './billing-tenant-pricing.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/billing-workspace.scss', './billing-tenant-pricing.page.scss'],
})
export class BillingTenantPricingPage implements OnInit {
  private readonly api = inject(BillingAdminService);
  private readonly plansApi = inject(SubscriptionAdminService);

  planOptions: { code: string; name: string }[] = [];

  readonly loading = signal(true);
  readonly assigning = signal(false);
  filterTenantId = '';
  rows: Record<string, unknown>[] = [];

  assignOpen = false;
  tenantId: number | null = null;
  planCode = 'STARTER';
  billingInterval: 'MONTHLY' | 'ANNUAL' = 'MONTHLY';
  negotiatedAmount = '';
  reason = '';

  ngOnInit(): void {
    this.reload();
    this.plansApi.listPlans().subscribe({
      next: (plans) => {
        this.planOptions = plans.map((p) => ({ code: p.code, name: p.name }));
      },
    });
  }

  reload(): void {
    this.loading.set(true);
    const id = this.filterTenantId ? Number(this.filterTenantId) : undefined;
    this.api.listTenantPriceAssignments(id).subscribe({
      next: (res) => {
        this.rows = (res.data as { data?: Record<string, unknown>[] })?.data ?? [];
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onTenantPicked(selection: BillingTenantSelection | null): void {
    this.tenantId = selection?.id ?? null;
  }

  openAssign(): void {
    this.assignOpen = true;
    this.tenantId = null;
  }

  closeAssign(): void {
    if (this.assigning()) {
      return;
    }
    this.assignOpen = false;
  }

  assign(): void {
    if (this.tenantId === null || !this.reason.trim() || !this.negotiatedAmount) {
      return;
    }
    this.assigning.set(true);
    this.api
      .assignTenantPrice({
        tenant_id: this.tenantId,
        plan_code: this.planCode,
        billing_interval: this.billingInterval,
        negotiated_amount: this.negotiatedAmount,
        reason: this.reason.trim(),
      })
      .subscribe({
        next: () => {
          this.assigning.set(false);
          this.assignOpen = false;
          this.reason = '';
          this.reload();
        },
        error: () => this.assigning.set(false),
      });
  }
}
