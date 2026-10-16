import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { cfFormatDate } from '@shared/utils/cf-intl.util';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { BillingAdminService } from '../../services/billing-admin.service';

@Component({
  selector: 'app-billing-investigations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, BillingAdminNavComponent, ModalShellComponent],
  templateUrl: './billing-investigations.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/billing-workspace.scss'],
})
export class BillingInvestigationsPage implements OnInit {
  private readonly api = inject(BillingAdminService);

  readonly loading = signal(true);
  readonly resolving = signal(false);
  rows: Record<string, unknown>[] = [];

  resolveRow: Record<string, unknown> | null = null;
  resolveNote = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.listInvestigations('open').subscribe({
      next: (res) => {
        this.rows = (res.data as { data?: Record<string, unknown>[] })?.data ?? [];
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatWhen(value: unknown): string {
    return typeof value === 'string' ? cfFormatDate(value) || value : '—';
  }

  openResolve(row: Record<string, unknown>): void {
    this.resolveRow = row;
    this.resolveNote = '';
  }

  closeResolve(): void {
    if (!this.resolving()) {
      this.resolveRow = null;
    }
  }

  confirmResolve(): void {
    if (!this.resolveRow || !this.resolveNote.trim()) {
      return;
    }
    this.resolving.set(true);
    this.api.resolveInvestigation(Number(this.resolveRow['id']), this.resolveNote.trim()).subscribe({
      next: () => {
        this.resolving.set(false);
        this.resolveRow = null;
        this.reload();
      },
      error: () => this.resolving.set(false),
    });
  }
}
