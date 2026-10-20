import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { StatusBadgeComponent, StatusBadgeTone } from '@shared/components/status-badge/status-badge.component';
import { ToastService } from '@core/services/toast.service';
import { MarketingSeoMonitoringService } from '../../services/marketing-seo-monitoring.service';
import {
  SeoMonitoringCheck,
  SeoMonitoringSnapshot,
  SeoMonitoringSummary,
  SeoMonitoringSummaryCounts,
} from '../../models/marketing-seo-monitoring.models';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';

@Component({
  selector: 'app-marketing-seo-monitoring-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    CfDatePipe,
    StatusBadgeComponent,
    CfEmptyStateComponent,
  ],
  templateUrl: './marketing-seo-monitoring-runbook.page.html',
  styleUrl: './marketing-seo-monitoring-runbook.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingSeoMonitoringPage implements OnInit {
  private readonly api = inject(MarketingSeoMonitoringService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly gscUrl = 'https://search.google.com/search-console/';
  readonly psiUrl = 'https://pagespeed.web.dev/';
  readonly ga4Url = 'https://analytics.google.com/';
  readonly marketingSite = 'https://ekklesianexus.com';

  readonly weeklyCommands = ['cd EkklesiaNexusWeb', 'npm run monitor:weekly:production'];
  readonly localRegression = [
    'npm run validate:content && npm run validate:i18n',
    'npm run test:unit && npm run build',
  ];

  loading = signal(true);
  scanning = signal(false);
  loadError = signal<string | null>(null);
  snapshot = signal<SeoMonitoringSnapshot | null>(null);
  includeProduction = false;

  filterSeverity = '';
  filterSource = '';
  filterStatus = '';
  filterSearch = '';

  selectedFinding: SeoMonitoringCheck | null = null;
  viewMode: 'findings' | 'checks' = 'findings';

  ngOnInit(): void {
    this.refreshSnapshot();
  }

  refreshSnapshot(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getSnapshot().subscribe({
      next: (data) => {
        this.snapshot.set(data);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.loadError.set(err.error?.message ?? err.message ?? 'Could not load snapshot.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  runScan(): void {
    if (this.scanning()) {
      return;
    }
    this.scanning.set(true);
    this.api.runScan(this.includeProduction).subscribe({
      next: () => {
        this.toast.success(
          this.includeProduction
            ? 'Scan completed (CMS + live production HTTP checks).'
            : 'CMS scan completed.',
        );
        this.scanning.set(false);
        this.refreshSnapshot();
      },
      error: (err: { status?: number; error?: { message?: string; data?: unknown }; message?: string }) => {
        if (err.status === 409) {
          this.toast.error('A scan is already running. Wait for it to finish.');
        } else {
          this.toast.error(err.error?.message ?? err.message ?? 'Scan failed.');
        }
        this.scanning.set(false);
        this.refreshSnapshot();
        this.cdr.markForCheck();
      },
    });
  }

  cmsSummary(): SeoMonitoringSummaryCounts | null {
    const summary = this.snapshot()?.cms?.summary as SeoMonitoringSummary | undefined;
    return summary?.cms ?? null;
  }

  productionSummary(): SeoMonitoringSummaryCounts | null {
    const prod = this.snapshot()?.production;
    if (!prod || prod.never_run) {
      return null;
    }
    const summary = prod.summary as SeoMonitoringSummary | undefined;
    return summary?.production_http ?? null;
  }

  openFindingsCount(): { critical: number; warning: number; info: number } {
    const cms = this.snapshot()?.cms?.findings ?? [];
    const prod = this.snapshot()?.production?.never_run ? [] : this.snapshot()?.production?.findings ?? [];
    const all = [...cms, ...prod];
    return {
      critical: all.filter((f) => f.severity === 'critical').length,
      warning: all.filter((f) => f.severity === 'warning').length,
      info: all.filter((f) => f.severity === 'info').length,
    };
  }

  allChecks(): SeoMonitoringCheck[] {
    const cms = this.snapshot()?.cms?.checks ?? [];
    const prod = this.snapshot()?.production?.never_run ? [] : this.snapshot()?.production?.checks ?? [];
    return [...cms, ...prod];
  }

  displayedRows(): SeoMonitoringCheck[] {
    const base =
      this.viewMode === 'findings'
        ? [
            ...(this.snapshot()?.cms?.findings ?? []),
            ...(this.snapshot()?.production?.never_run ? [] : this.snapshot()?.production?.findings ?? []),
          ]
        : this.allChecks();

    const q = this.filterSearch.trim().toLowerCase();
    return base.filter((row) => {
      if (this.filterSeverity && row.severity !== this.filterSeverity) {
        return false;
      }
      if (this.filterSource && row.source !== this.filterSource) {
        return false;
      }
      if (this.filterStatus && row.status !== this.filterStatus) {
        return false;
      }
      if (!q) {
        return true;
      }
      const hay = `${row.message} ${row.evidence} ${row.url ?? ''} ${row.check_id}`.toLowerCase();
      return hay.includes(q);
    });
  }

  resetFilters(): void {
    this.filterSeverity = '';
    this.filterSource = '';
    this.filterStatus = '';
    this.filterSearch = '';
  }

  statusTone(status: string): StatusBadgeTone {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'critical';
      case 'error':
        return 'warning';
      case 'not_run':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  severityTone(severity: string): StatusBadgeTone {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'neutral';
    }
  }

  openDetail(row: SeoMonitoringCheck): void {
    this.selectedFinding = row;
  }

  closeDetail(): void {
    this.selectedFinding = null;
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  cmsSitemapCount(): string {
    const check = (this.snapshot()?.cms?.checks ?? []).find((c) => c.check_id === 'cms-sitemap-url-count');
    if (!check?.evidence) {
      return '—';
    }
    const match = check.evidence.match(/indexable_url_count=(\d+)/);
    return match ? match[1] : '—';
  }
}
