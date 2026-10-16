import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { cfFormatDate } from '@shared/utils/cf-intl.util';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { BillingAdminService } from '../../services/billing-admin.service';

interface OrderDetail {
  order: Record<string, unknown>;
  tenant?: { id: number; name: string };
  payment_attempts?: Record<string, unknown>[];
  invoice?: Record<string, unknown>;
  refunds?: Record<string, unknown>[];
  webhook_events?: Record<string, unknown>[];
  credit_notes?: Record<string, unknown>[];
}

@Component({
  selector: 'app-billing-transactions-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, BillingAdminNavComponent, ModalShellComponent],
  templateUrl: './billing-transactions.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/billing-workspace.scss', './billing-transactions.page.scss'],
})
export class BillingTransactionsPage implements OnInit {
  private readonly api = inject(BillingAdminService);

  readonly loading = signal(true);
  reference = '';
  rows: Record<string, unknown>[] = [];
  detail: OrderDetail | null = null;
  refundAmount = '';
  refundReason = '';
  refundBusy = false;
  refundOpen = false;

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.api.listOrders({ reference: this.reference.trim() || undefined }).subscribe({
      next: (res) => {
        this.rows = (res.data as { data?: Record<string, unknown>[] })?.data ?? [];
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(row: Record<string, unknown>): void {
    this.api.getOrder(Number(row['id'])).subscribe({
      next: (res) => {
        this.detail = res.data as OrderDetail;
        this.refundAmount = '';
        this.refundReason = '';
      },
    });
  }

  close(): void {
    this.detail = null;
    this.refundOpen = false;
  }

  openRefund(): void {
    this.refundOpen = true;
  }

  closeRefund(): void {
    if (this.refundBusy) {
      return;
    }
    this.refundOpen = false;
  }

  runReconciliation(): void {
    this.api.runReconciliation().subscribe();
  }

  formatDate(value: unknown): string {
    return typeof value === 'string' ? cfFormatDate(value) || value : '—';
  }

  primaryAttempt(): Record<string, unknown> | null {
    const attempts = this.detail?.payment_attempts ?? [];
    return attempts.find((a) => a['status'] === 'captured') ?? attempts[0] ?? null;
  }

  requestRefund(): void {
    const attempt = this.primaryAttempt();
    if (!attempt || !this.refundAmount || !this.refundReason.trim()) {
      return;
    }
    this.refundBusy = true;
    this.api
      .requestRefund({
        billing_payment_attempt_id: Number(attempt['id']),
        amount: this.refundAmount,
        reason: this.refundReason.trim(),
      })
      .subscribe({
        next: (res) => {
          const refundId = (res.data as { id?: number })?.id;
          if (refundId) {
            this.api.approveRefund(refundId, this.refundReason.trim()).subscribe({
              next: () => {
                this.refundBusy = false;
                if (this.detail?.order?.['id']) {
                  this.open(this.detail.order);
                }
              },
              error: () => (this.refundBusy = false),
            });
          } else {
            this.refundBusy = false;
          }
        },
        error: () => (this.refundBusy = false),
      });
  }
}
