import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { BillingAdminService, BillingPromotionRow } from '../../services/billing-admin.service';

@Component({
  selector: 'app-billing-promotions-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, BillingAdminNavComponent, ModalShellComponent],
  templateUrl: './billing-promotions.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/billing-workspace.scss', './billing-promotions.page.scss'],
})
export class BillingPromotionsPage implements OnInit {
  private readonly api = inject(BillingAdminService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  rows: BillingPromotionRow[] = [];
  filteredRows: BillingPromotionRow[] = [];

  search = '';
  statusFilter = '';

  createOpen = false;
  name = '';
  code = '';
  discountType: 'percent' | 'fixed_amount' | 'fixed_price' = 'percent';
  discountValue = '';
  planCode = 'STARTER';
  billingInterval: 'MONTHLY' | 'ANNUAL' | '' = 'MONTHLY';
  reason = '';

  activateRow: BillingPromotionRow | null = null;
  activateReason = '';
  editRow: BillingPromotionRow | null = null;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listPromotions().subscribe({
      next: (res) => {
        const data = res.data as { data?: BillingPromotionRow[] };
        this.rows = data?.data ?? [];
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load promotions.');
        this.loading.set(false);
      },
    });
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    this.filteredRows = this.rows.filter((row) => {
      if (this.statusFilter && row.status !== this.statusFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
    });
  }

  openCreate(): void {
    this.createOpen = true;
    this.error.set(null);
  }

  closeCreate(): void {
    if (this.saving()) {
      return;
    }
    this.createOpen = false;
  }

  create(): void {
    if (!this.name.trim() || !this.reason.trim()) {
      this.error.set('Name and reason are required.');
      return;
    }
    this.saving.set(true);
    this.api
      .createPromotion({
        name: this.name.trim(),
        code: this.code.trim() || undefined,
        discount_type: this.discountType,
        discount_value: this.discountValue ? Number(this.discountValue) : undefined,
        internal_note: this.reason.trim(),
        plan_eligibility: this.planCode
          ? [{ plan_code: this.planCode, billing_interval: this.billingInterval || null }]
          : [],
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createOpen = false;
          this.name = '';
          this.code = '';
          this.discountValue = '';
          this.reason = '';
          this.reload();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Create failed.');
        },
      });
  }

  openEdit(row: BillingPromotionRow): void {
    this.editRow = row;
    this.api.getPromotion(row.id).subscribe({
      next: (res) => {
        const p = res.data.promotion;
        this.name = p.name;
        this.discountType = (p.discount_type as 'percent' | 'fixed_amount' | 'fixed_price') ?? 'percent';
        this.discountValue = p.discount_value ?? '';
        this.reason = '';
      },
    });
  }

  closeEdit(): void {
    if (!this.saving()) {
      this.editRow = null;
    }
  }

  saveEdit(): void {
    if (!this.editRow || !this.name.trim()) {
      return;
    }
    this.saving.set(true);
    this.api
      .updatePromotion(this.editRow.id, {
        name: this.name.trim(),
        discount_type: this.discountType,
        discount_value: this.discountValue ? Number(this.discountValue) : null,
        internal_note: this.reason.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editRow = null;
          this.reload();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Update failed.');
        },
      });
  }

  openActivate(row: BillingPromotionRow): void {
    this.activateRow = row;
    this.activateReason = '';
  }

  closeActivate(): void {
    if (this.saving()) {
      return;
    }
    this.activateRow = null;
  }

  confirmActivate(): void {
    if (!this.activateRow || !this.activateReason.trim()) {
      return;
    }
    this.saving.set(true);
    this.api.setPromotionStatus(this.activateRow.id, 'active', this.activateReason.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.activateRow = null;
        this.reload();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Activation failed.');
      },
    });
  }
}
