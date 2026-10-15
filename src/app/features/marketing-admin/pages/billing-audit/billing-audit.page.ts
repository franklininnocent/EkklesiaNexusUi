import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { cfFormatDate } from '@shared/utils/cf-intl.util';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { BillingAdminService } from '../../services/billing-admin.service';

@Component({
  selector: 'app-billing-audit-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, BillingAdminNavComponent],
  templateUrl: './billing-audit.page.html',
  styleUrls: ['../../styles/billing-workspace.scss'],
})
export class BillingAuditPage implements OnInit {
  private readonly api = inject(BillingAdminService);

  readonly loading = signal(true);
  rows: Record<string, unknown>[] = [];

  ngOnInit(): void {
    this.api.listAuditEvents().subscribe({
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
}
