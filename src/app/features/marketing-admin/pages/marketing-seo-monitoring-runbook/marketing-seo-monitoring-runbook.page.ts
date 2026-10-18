import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-marketing-seo-monitoring-runbook-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './marketing-seo-monitoring-runbook.page.html',
  styleUrl: './marketing-seo-monitoring-runbook.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingSeoMonitoringRunbookPage {
  readonly gscUrl = 'https://search.google.com/search-console/';
  readonly psiUrl = 'https://pagespeed.web.dev/';
  readonly ga4Url = 'https://analytics.google.com/';
  readonly marketingSite = 'https://ekklesianexus.com';

  readonly weeklyCommands = [
    'cd EkklesiaNexusWeb',
    'npm run monitor:weekly:production',
  ];

  readonly localRegression = [
    'npm run validate:content && npm run validate:i18n',
    'npm run test:unit && npm run build',
  ];
}
