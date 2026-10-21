import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@core/errors/api-error';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { TabStripComponent, TabStripItem } from '@shared/components/tab-strip/tab-strip.component';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { environment } from '@environments/environment';
import { MarketingPlanCatalogService } from '../../services/marketing-plan-catalog.service';
import {
  PlanCatalogEditorFeature,
  PlanCatalogEditorPlan,
  PlanCatalogFeatureVisibilityEditor,
  PlanCatalogPublicLimit,
  PlanCatalogPublicPlan,
  PlanCatalogRegionalPriceRow,
  PlanCatalogPublishDiff,
  PlanCatalogRevisionRow,
  PlanCatalogRevisionSummary,
  PlanCatalogStatusOverview,
} from '../../models/marketing-plan-catalog.models';

type FeatureFilter = 'all' | 'visible' | 'hidden';
type WorkspaceTab = 'overview' | 'plans' | 'features' | 'preview' | 'publish';

@Component({
  selector: 'app-marketing-plan-catalog-publish-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingSkeletonComponent,
    StatusBadgeComponent,
    CfEmptyStateComponent,
    TabStripComponent,
    CfDatePipe,
    CfCurrencyPipe,
  ],
  templateUrl: './marketing-plan-catalog-publish.page.html',
  styleUrl: './marketing-plan-catalog-publish.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingPlanCatalogPublishPage implements OnInit {
  private readonly api = inject(MarketingPlanCatalogService);
  private readonly confirm = inject(ConfirmationDialogService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  working = false;
  error: string | null = null;
  errorDetails: string[] = [];
  success: string | null = null;
  status: PlanCatalogStatusOverview | null = null;
  revisions: PlanCatalogRevisionRow[] = [];
  previewUrl: SafeResourceUrl | null = null;
  previewOpenUrl: string | null = null;
  previewLoading = false;
  previewViewport: 'desktop' | 'mobile' = 'desktop';
  editor: PlanCatalogFeatureVisibilityEditor | null = null;
  workingPlans: PlanCatalogEditorPlan[] = [];
  selectedPlanCode: string | null = null;
  featureFilter: FeatureFilter = 'all';
  featureQuery = '';
  visibilityDirty = false;
  savingVisibility = false;
  previewCards: PlanCatalogEditorPlan[] = [];
  previewComparisonRows: Array<{ code: string; name: string }> = [];
  hiddenFromAll: string[] = [];
  publishDiff: PlanCatalogPublishDiff | null = null;
  workspaceTab: WorkspaceTab = 'overview';
  readonly marketingSiteOrigin = environment.websiteUrl.replace(/\/$/, '');
  readonly publicPricingUrl = `${this.marketingSiteOrigin}/#pricing`;
  readonly workspaceTabs: TabStripItem[] = [
    { id: 'overview', label: 'Overview', domId: 'tab-overview', ariaControls: 'panel-workspace' },
    { id: 'plans', label: 'Plans', domId: 'tab-plans', ariaControls: 'panel-workspace' },
    { id: 'features', label: 'Features', domId: 'tab-features', ariaControls: 'panel-workspace' },
    { id: 'preview', label: 'Preview', domId: 'tab-preview', ariaControls: 'panel-workspace' },
    { id: 'publish', label: 'Publish', domId: 'tab-publish', ariaControls: 'panel-workspace' },
  ];

  ngOnInit(): void {
    this.reload();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.visibilityDirty) {
      return;
    }
    event.preventDefault();
    event.returnValue = true;
  }

  get selectedPlan(): PlanCatalogEditorPlan | null {
    return this.workingPlans.find((plan) => plan.code === this.selectedPlanCode) ?? this.workingPlans[0] ?? null;
  }

  get headerStatusLabel(): string {
    if (this.visibilityDirty) {
      return 'Unsaved changes';
    }
    if (this.status?.draft && this.status.published) {
      return `Draft #${this.status.draft.revision_number} · live #${this.status.published.revision_number}`;
    }
    if (this.status?.draft) {
      return `Draft #${this.status.draft.revision_number} — not published`;
    }
    if (this.status?.published) {
      return `Published · revision #${this.status.published.revision_number}`;
    }
    return 'Not on website yet';
  }

  get headerStatusTone(): 'success' | 'warning' | 'info' | 'neutral' {
    if (this.visibilityDirty) {
      return 'warning';
    }
    if (this.status?.published && !this.status.draft) {
      return 'success';
    }
    if (this.status?.draft) {
      return 'info';
    }
    return 'warning';
  }

  get generateDisabledReason(): string | null {
    if (this.working) {
      return 'A request is already in progress.';
    }
    if (!this.status?.readiness?.can_generate_preview) {
      return 'Fix the subscription catalog issues listed on Overview before creating a draft.';
    }
    return null;
  }

  get publishDisabledReason(): string | null {
    if (!this.status?.draft) {
      return 'Create a draft snapshot first.';
    }
    if (this.visibilityDirty) {
      return 'Save draft visibility before publishing.';
    }
    if (this.working) {
      return 'A request is already in progress.';
    }
    return null;
  }

  onWorkspaceTabChange(id: string): void {
    this.workspaceTab = id as WorkspaceTab;
    if (this.workspaceTab === 'publish' && this.status?.draft) {
      this.loadPublishDiff(this.status.draft.id);
    }
    this.cdr.markForCheck();
  }

  reload(): void {
    const initial = this.status === null;
    if (initial) {
      this.loading = true;
    } else {
      this.working = true;
    }
    this.error = null;
    this.cdr.markForCheck();
    this.api.getStatus().subscribe({
      next: (status) => {
        this.status = status;
        this.api.listRevisions().subscribe({
          next: (rows) => {
            this.revisions = rows;
            this.loading = false;
            this.working = false;
            if (status.draft?.id) {
              this.loadEditor(status.draft.id);
            } else {
              this.editor = null;
              this.workingPlans = [];
              this.previewCards = [];
              this.previewComparisonRows = [];
              this.publishDiff = null;
            }
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.loading = false;
            this.working = false;
            this.error = apiErrorMessage(err, 'Unable to load revision history.');
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.working = false;
        this.applyHttpError(err, 'Unable to load website subscription plans.');
        this.cdr.markForCheck();
      },
    });
  }

  generatePreview(): void {
    if (this.generateDisabledReason) {
      return;
    }
    const run = (): void => {
      this.working = true;
      this.error = null;
      this.errorDetails = [];
      this.success = null;
      this.cdr.markForCheck();
      this.api
        .generatePreview()
        .pipe(finalize(() => {
          this.working = false;
          this.cdr.markForCheck();
        }))
        .subscribe({
          next: () => {
            this.success = 'Draft snapshot created from the current subscription catalog. The live website is unchanged.';
            this.previewUrl = null;
            this.previewOpenUrl = null;
            this.visibilityDirty = false;
            this.workspaceTab = 'plans';
            this.reload();
          },
          error: (err: HttpErrorResponse) => {
            this.applyHttpError(err, 'Could not create a draft snapshot.');
          },
        });
    };

    if (this.visibilityDirty) {
      this.confirm
        .confirm({
          title: 'Replace the current draft?',
          message: 'You have unsaved website feature changes. Creating a new snapshot will discard them.',
          confirmText: 'Create new draft',
          variant: 'danger',
        })
        .subscribe((result) => {
          if (result.confirmed) {
            run();
          }
        });
      return;
    }

    run();
  }

  private applyHttpError(err: unknown, fallback: string): void {
    const shaped = err as {
      message?: string;
      status?: number;
      code?: string;
      errors?: string[] | Record<string, string[]>;
      error?: {
        message?: string;
        code?: string;
        data?: { blocking_errors?: string[]; errors?: string[] };
      };
    };
    const body = shaped.error;
    this.error = body?.message ?? shaped.message ?? fallback;
    const fromReadiness = body?.data?.blocking_errors ?? body?.data?.errors;
    const fromInterceptor = Array.isArray(shaped.errors) ? shaped.errors : [];
    this.errorDetails = Array.isArray(fromReadiness) ? fromReadiness : fromInterceptor;
    const code = body?.code ?? shaped.code;
    const status = shaped.status;
    if (status === 503 && (code === 'schema_missing' || (this.error ?? '').includes('migrate'))) {
      this.errorDetails = [
        'On the machine running the Laravel API (EkklesiaNexusApi), run: php artisan migrate',
        'Then click Refresh on this page and try Create draft again.',
      ];
    }
  }

  openPreview(revisionId: number, openInNewTab = false): void {
    this.previewLoading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.api
      .issuePreviewToken(revisionId)
      .pipe(
        finalize(() => {
          this.previewLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (token) => {
          const url = token.preview_url ?? this.api.marketingSitePreviewUrl(token.preview_path);
          this.previewOpenUrl = url;
          if (openInNewTab) {
            window.open(url, '_blank', 'noopener,noreferrer');
            this.cdr.markForCheck();
            return;
          }
          this.workspaceTab = 'preview';
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.previewOpenUrl = null;
          this.previewUrl = null;
          this.applyHttpError(err, 'Could not open the marketing site preview.');
          this.errorDetails = [
            ...this.errorDetails,
            `Marketing site should be running at ${this.marketingSiteOrigin}.`,
            'The marketing site needs LARAVEL_API_URL pointing at your Laravel API.',
          ];
        },
      });
  }

  openPreviewInNewTab(revisionId: number): void {
    this.openPreview(revisionId, true);
  }

  closeEmbeddedPreview(): void {
    this.previewUrl = null;
    this.previewOpenUrl = null;
    this.cdr.markForCheck();
  }

  loadEditor(revisionId: number): void {
    this.api.getFeatureVisibility(revisionId).subscribe({
      next: (editor) => {
        this.applyEditor(editor);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.applyHttpError(err, 'Unable to load feature visibility.');
        this.cdr.markForCheck();
      },
    });
  }

  private readonly websiteRegionalCurrencies: Array<{ currency: 'INR' | 'USD' | 'BRL'; label: string }> = [
    { currency: 'INR', label: 'India (INR)' },
    { currency: 'USD', label: 'United States & rest of world (USD)' },
    { currency: 'BRL', label: 'Brazil (BRL)' },
  ];

  regionalPriceRows(plan: PlanCatalogPublicPlan | null): PlanCatalogRegionalPriceRow[] {
    if (!plan?.regional_prices) {
      return [];
    }
    const rows: PlanCatalogRegionalPriceRow[] = [];
    for (const { currency, label } of this.websiteRegionalCurrencies) {
      const entry = plan.regional_prices[currency];
      if (!entry) {
        continue;
      }
      const monthly = entry.monthly_price ?? null;
      const annual = entry.annual_price ?? null;
      if (monthly == null && annual == null) {
        continue;
      }
      rows.push({ currency, label, monthly, annual });
    }
    return rows;
  }

  publicPlan(code: string): PlanCatalogPublicPlan | null {
    const fromPayload = this.editor?.public_payload.find((plan) => plan.code === code);
    if (fromPayload) {
      return fromPayload;
    }
    const plan = this.workingPlans.find((row) => row.code === code);
    if (!plan) {
      return null;
    }
    return {
      code: plan.code,
      name: plan.name,
      short_description: plan.short_description,
      badge_label: plan.badge_label,
      pricing_type: plan.pricing_type ?? undefined,
      currency_code: plan.currency_code,
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      billing_intervals: plan.billing_intervals,
      limits: plan.limits,
    };
  }

  listedPlans(): PlanCatalogEditorPlan[] {
    return this.workingPlans.filter((plan) => plan.listed);
  }

  setPlanListed(planCode: string, listed: boolean): void {
    const plan = this.workingPlans.find((row) => row.code === planCode);
    if (!plan || plan.listed === listed) {
      return;
    }
    plan.listed = listed;
    this.visibilityDirty = true;
    this.success = null;
    this.rebuildPreviewCaches();
    this.cdr.markForCheck();
  }

  filteredFeatures(plan: PlanCatalogEditorPlan | null): PlanCatalogEditorFeature[] {
    if (!plan) {
      return [];
    }
    const query = this.featureQuery.trim().toLowerCase();
    return plan.features.filter((feature) => {
      if (this.featureFilter === 'visible' && !feature.visible) {
        return false;
      }
      if (this.featureFilter === 'hidden' && feature.visible) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [feature.name, feature.code, feature.category, feature.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }

  selectPlan(code: string): void {
    this.selectedPlanCode = code;
    this.workspaceTab = 'features';
    this.cdr.markForCheck();
  }

  setFeatureFilter(filter: FeatureFilter): void {
    this.featureFilter = filter;
    this.cdr.markForCheck();
  }

  onFeatureQueryChange(value: string): void {
    this.featureQuery = value;
    this.cdr.markForCheck();
  }

  setFeatureVisible(planCode: string, featureCode: string, visible: boolean): void {
    const plan = this.workingPlans.find((row) => row.code === planCode);
    const feature = plan?.features.find((row) => row.code === featureCode);
    if (!plan || !feature || feature.visible === visible) {
      return;
    }
    feature.visible = visible;
    plan.visible_count = plan.features.filter((row) => row.visible).length;
    plan.hidden_count = plan.features.length - plan.visible_count;
    this.visibilityDirty = true;
    this.success = null;
    this.rebuildPreviewCaches();
    this.cdr.markForCheck();
  }

  restoreFeature(planCode: string, featureCode: string): void {
    this.setFeatureVisible(planCode, featureCode, true);
  }

  cardFeatures(plan: PlanCatalogEditorPlan): PlanCatalogEditorFeature[] {
    return plan.features.filter((feature) => feature.visible && feature.included && feature.kind === 'feature');
  }

  comparisonCell(plan: PlanCatalogEditorPlan, featureCode: string): string {
    const row = plan.features.find((feature) => feature.code === featureCode);
    if (!row || !row.visible) {
      return '—';
    }
    return row.included ? '✓' : '—';
  }

  limitLabel(limit: PlanCatalogPublicLimit): string {
    if (limit.unlimited || limit.value === null) {
      return `${limit.name}: Unlimited`;
    }
    return `${limit.name}: ${limit.value}${limit.unit ? ' ' + limit.unit : ''}`;
  }

  saveVisibility(): void {
    const draft = this.status?.draft;
    const editor = this.editor;
    if (!draft || !editor || !this.visibilityDirty || this.savingVisibility) {
      return;
    }
    this.savingVisibility = true;
    this.error = null;
    this.cdr.markForCheck();
    this.api
      .saveFeatureVisibility(draft.id, editor.payload_hash, this.hiddenMap(), this.hiddenPlans())
      .pipe(finalize(() => {
        this.savingVisibility = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (saved) => {
          this.applyEditor(saved);
          if (this.status?.draft) {
            this.status.draft.payload_hash = saved.payload_hash;
          }
          this.success = 'Draft saved. The live marketing website is unchanged until you publish.';
          this.previewUrl = null;
        },
        error: (err: HttpErrorResponse) => {
          this.applyHttpError(err, 'Could not save draft visibility.');
        },
      });
  }

  goToPreview(): void {
    this.workspaceTab = 'preview';
    this.cdr.markForCheck();
  }

  goToPublish(): void {
    if (this.publishDisabledReason) {
      this.error = this.publishDisabledReason;
      this.cdr.markForCheck();
      return;
    }
    this.workspaceTab = 'publish';
    if (this.status?.draft) {
      this.loadPublishDiff(this.status.draft.id);
    }
    this.cdr.markForCheck();
  }

  private applyEditor(editor: PlanCatalogFeatureVisibilityEditor): void {
    this.editor = editor;
    this.workingPlans = editor.plans.map((plan) => ({
      ...plan,
      listed: plan.listed !== false,
      features: plan.features.map((feature) => ({ ...feature })),
    }));
    this.selectedPlanCode = this.selectedPlanCode && this.workingPlans.some((plan) => plan.code === this.selectedPlanCode)
      ? this.selectedPlanCode
      : this.workingPlans[0]?.code ?? null;
    this.visibilityDirty = false;
    this.rebuildPreviewCaches();
  }

  private rebuildPreviewCaches(): void {
    this.previewCards = this.listedPlans();
    const rows = new Map<string, string>();
    const counts = new Map<string, { total: number; hidden: number }>();
    for (const plan of this.previewCards) {
      for (const feature of plan.features) {
        if (feature.visible && !rows.has(feature.code)) {
          rows.set(feature.code, feature.name);
        }
        const current = counts.get(feature.code) ?? { total: 0, hidden: 0 };
        current.total += 1;
        if (!feature.visible) {
          current.hidden += 1;
        }
        counts.set(feature.code, current);
      }
    }
    this.previewComparisonRows = [...rows.entries()].map(([code, name]) => ({ code, name }));
    this.hiddenFromAll = [...counts.entries()]
      .filter(([, value]) => value.total > 0 && value.hidden === value.total)
      .map(([code]) => code);
  }

  private hiddenMap(): Record<string, string[]> {
    const hidden: Record<string, string[]> = {};
    for (const plan of this.workingPlans) {
      const codes = plan.features.filter((feature) => !feature.visible).map((feature) => feature.code);
      if (codes.length) {
        hidden[plan.code] = codes;
      }
    }
    return hidden;
  }

  private hiddenPlans(): string[] {
    return this.workingPlans.filter((plan) => !plan.listed).map((plan) => plan.code);
  }

  private loadPublishDiff(revisionId: number): void {
    this.api.publishDiff(revisionId).subscribe({
      next: (diff) => {
        this.publishDiff = diff;
        this.cdr.markForCheck();
      },
      error: () => {
        this.publishDiff = null;
        this.cdr.markForCheck();
      },
    });
  }

  approvePublish(revision: PlanCatalogRevisionSummary | PlanCatalogRevisionRow): void {
    if (this.publishDisabledReason) {
      this.error = this.publishDisabledReason;
      this.cdr.markForCheck();
      return;
    }
    this.api.publishDiff(revision.id).subscribe({
      next: (diff) => {
        this.publishDiff = diff;
        const hidden = diff.visibility?.hidden ?? [];
        const restored = diff.visibility?.restored ?? [];
        const hiddenPlans = diff.visibility?.plans?.hidden ?? [];
        const restoredPlans = diff.visibility?.plans?.restored ?? [];
        const lines = [
          `Publish draft revision #${revision.revision_number} with ${diff.plan_count} plan(s)?`,
          diff.added.length ? `Added: ${diff.added.join(', ')}` : null,
          diff.removed.length ? `Removed: ${diff.removed.join(', ')}` : null,
          diff.changed.length ? `Changed: ${diff.changed.join(', ')}` : null,
          hiddenPlans.length ? `Hidden from website: ${hiddenPlans.join(', ')}` : null,
          restoredPlans.length ? `Restored on website: ${restoredPlans.join(', ')}` : null,
          hidden.length
            ? `Hidden on website: ${hidden.map((row) => `${row.name} (${row.plan_code})`).join(', ')}`
            : null,
          restored.length
            ? `Restored on website: ${restored.map((row) => `${row.name} (${row.plan_code})`).join(', ')}`
            : null,
          (diff.hidden_from_all ?? []).length
            ? `Hidden from every plan: ${diff.hidden_from_all?.join(', ')}`
            : null,
          'Visitors will see this revision on the public marketing website.',
        ].filter(Boolean);

        this.confirm
          .confirm({
            title: 'Publish website subscription plans',
            message: lines.join('\n'),
            confirmText: 'Publish to website',
            variant: 'primary',
          })
          .subscribe((result) => {
            if (!result.confirmed) {
              return;
            }
            this.working = true;
            this.cdr.markForCheck();
            this.api
              .publish(revision.id, this.editor?.payload_hash ?? revision.payload_hash)
              .pipe(finalize(() => {
                this.working = false;
                this.cdr.markForCheck();
              }))
              .subscribe({
                next: () => {
                  this.success = 'Website subscription plans are live on the marketing site.';
                  this.previewUrl = null;
                  this.workspaceTab = 'overview';
                  this.reload();
                },
                error: (err: { error?: { message?: string } }) => {
                  this.error = err.error?.message ?? 'Publication failed. The previously published website is unchanged.';
                },
              });
          });
      },
    });
  }

  retryRevalidate(): void {
    this.api.retryRevalidate().subscribe({
      next: (result) => {
        this.success =
          result.status === 'succeeded'
            ? 'Marketing site cache refresh succeeded.'
            : 'Cache refresh attempted.';
        this.reload();
      },
      error: () => {
        this.error = 'Cache refresh failed.';
        this.cdr.markForCheck();
      },
    });
  }

  setViewport(mode: 'desktop' | 'mobile'): void {
    this.previewViewport = mode;
    this.cdr.markForCheck();
  }

  revisionStatusLabel(status: string): string {
    const normalized = (status ?? '').toUpperCase();
    switch (normalized) {
      case 'DRAFT':
        return 'Draft';
      case 'PUBLISHED':
        return 'Published';
      case 'ARCHIVED':
        return 'Archived';
      default:
        return status || 'Unknown';
    }
  }

  revisionTone(status: string): 'success' | 'warning' | 'info' | 'neutral' {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'PUBLISHED') {
      return 'success';
    }
    if (normalized === 'DRAFT') {
      return 'info';
    }
    return 'neutral';
  }

  isCurrentDraftRevision(revisionId: number): boolean {
    return this.status?.draft?.id === revisionId;
  }

  isLiveRevision(revisionId: number): boolean {
    return this.status?.published?.id === revisionId;
  }
}
