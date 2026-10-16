import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { BillingTenantPickerComponent, BillingTenantSelection } from '../../components/billing-tenant-picker/billing-tenant-picker.component';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { BillingAdminService } from '../../services/billing-admin.service';

@Component({
  selector: 'app-billing-tenant-agreements-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    BillingAdminNavComponent,
    ModalShellComponent,
    BillingTenantPickerComponent,
  ],
  templateUrl: './billing-tenant-agreements.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/billing-workspace.scss'],
})
export class BillingTenantAgreementsPage implements OnInit {
  private readonly api = inject(BillingAdminService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  rows: Record<string, unknown>[] = [];
  filterTenantId = '';

  createOpen = false;
  tenantId: number | null = null;
  planCode = 'STARTER';
  billingInterval: 'MONTHLY' | 'ANNUAL' = 'MONTHLY';
  amount = '';
  currencyCode = 'USD';
  entitlementOnPartial = 'when_fully_paid';
  reason = '';

  revokeRow: Record<string, unknown> | null = null;
  revokeReason = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const id = this.filterTenantId ? Number(this.filterTenantId) : undefined;
    this.api.listTenantAgreements(id).subscribe({
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

  openCreate(): void {
    this.createOpen = true;
    this.tenantId = null;
  }

  closeCreate(): void {
    if (!this.saving()) {
      this.createOpen = false;
    }
  }

  submitCreate(): void {
    if (this.tenantId === null || !this.amount || !this.reason.trim()) {
      return;
    }
    this.saving.set(true);
    this.api
      .createTenantAgreement({
        tenant_id: this.tenantId,
        plan_code: this.planCode,
        billing_interval: this.billingInterval,
        amount: this.amount,
        currency_code: this.currencyCode,
        entitlement_on_partial: this.entitlementOnPartial,
        reason: this.reason.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createOpen = false;
          this.reload();
        },
        error: () => this.saving.set(false),
      });
  }

  openRevoke(row: Record<string, unknown>): void {
    this.revokeRow = row;
    this.revokeReason = '';
  }

  closeRevoke(): void {
    if (!this.saving()) {
      this.revokeRow = null;
    }
  }

  confirmRevoke(): void {
    if (!this.revokeRow || !this.revokeReason.trim()) {
      return;
    }
    this.saving.set(true);
    this.api.revokeTenantAgreement(Number(this.revokeRow['id']), this.revokeReason.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.revokeRow = null;
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }
}
