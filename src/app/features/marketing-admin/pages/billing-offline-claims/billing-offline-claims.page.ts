import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { BillingAdminService } from '../../services/billing-admin.service';

@Component({
  selector: 'app-billing-offline-claims-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, BillingAdminNavComponent, ModalShellComponent],
  templateUrl: './billing-offline-claims.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/billing-workspace.scss', './billing-offline-claims.page.scss'],
})
export class BillingOfflineClaimsPage implements OnInit {
  private readonly api = inject(BillingAdminService);

  readonly loading = signal(true);
  readonly actionBusy = signal(false);
  readonly error = signal<string | null>(null);
  rows: Record<string, unknown>[] = [];
  statusFilter = 'pending_verification';

  reviewRow: Record<string, unknown> | null = null;
  evidenceUrl: string | null = null;
  approveMode = false;
  rejectMode = false;
  rejectReason = '';
  secondApproverId = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.listOfflineClaims(this.statusFilter).subscribe({
      next: (res) => {
        this.rows = (res.data as { data?: Record<string, unknown>[] })?.data ?? [];
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load offline claims.');
        this.loading.set(false);
      },
    });
  }

  canActOn(row: Record<string, unknown>): boolean {
    const status = String(row['status'] ?? '');
    return status === 'pending_verification' || status === 'information_required';
  }

  openReview(row: Record<string, unknown>): void {
    this.reviewRow = row;
    this.evidenceUrl = null;
    this.approveMode = false;
    this.rejectMode = false;
    this.rejectReason = '';
    this.secondApproverId = '';
  }

  closeReview(): void {
    if (this.actionBusy()) {
      return;
    }
    this.reviewRow = null;
  }

  loadEvidence(): void {
    if (!this.reviewRow) {
      return;
    }
    this.api.getOfflineClaim(Number(this.reviewRow['id'])).subscribe({
      next: (res) => {
        this.evidenceUrl = res.data?.evidence_display_url ?? null;
      },
    });
  }

  startApprove(): void {
    this.approveMode = true;
    this.rejectMode = false;
  }

  cancelApprove(): void {
    this.approveMode = false;
  }

  startReject(): void {
    this.rejectMode = true;
    this.approveMode = false;
  }

  cancelReject(): void {
    this.rejectMode = false;
  }

  confirmApprove(): void {
    if (!this.reviewRow) {
      return;
    }
    this.actionBusy.set(true);
    const second = this.secondApproverId ? Number(this.secondApproverId) : undefined;
    this.api.approveOfflineClaim(Number(this.reviewRow['id']), undefined, second).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.reviewRow = null;
        this.reload();
      },
      error: () => {
        this.actionBusy.set(false);
        this.error.set('Approval failed. A second approver may be required.');
      },
    });
  }

  confirmReject(): void {
    if (!this.reviewRow || !this.rejectReason.trim()) {
      return;
    }
    this.actionBusy.set(true);
    this.api.rejectOfflineClaim(Number(this.reviewRow['id']), this.rejectReason.trim()).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.reviewRow = null;
        this.reload();
      },
      error: () => {
        this.actionBusy.set(false);
        this.error.set('Rejection failed.');
      },
    });
  }
}
