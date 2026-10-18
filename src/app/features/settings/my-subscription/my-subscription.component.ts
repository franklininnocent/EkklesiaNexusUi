import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TenantService } from '@core/services/tenant.service';
import { EntitlementService } from '@core/services/entitlement.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { StatusBadgeComponent, StatusBadgeTone } from '@shared/components/status-badge/status-badge.component';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import { PlanCompareTableComponent } from '@features/subscriptions/components/plan-compare-table/plan-compare-table.component';
import { PlanComparisonComponent } from '@features/subscriptions/components/plan-comparison/plan-comparison.component';
import { PlanFeatureDetailsPanelComponent } from '@features/subscriptions/components/plan-feature-details-panel/plan-feature-details-panel.component';
import { groupByFeatureCategory } from '@features/subscriptions/utils/subscription-feature-category.util';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { TenantSubscriptionService } from '@features/subscriptions/services/tenant-subscription.service';
import { subscriptionErrorMessage } from '@features/subscriptions/services/subscription-admin.service';
import { BillingInterval, PublicPlanCard } from '@features/subscriptions/models/subscription-admin.models';
import { PlanChangePreview } from '@features/subscriptions/models/subscription-admin.models';
import {
  CurrentPlanIdentity,
  FeatureCapabilitySection,
  TenantSubscriptionOverview,
  UpgradeRequest,
  UpgradeRequestStatus,
  UsageLevel,
  UsageRow,
} from '@features/subscriptions/models/tenant-subscription.models';
import { Subject, catchError, finalize, forkJoin, of, take, takeUntil } from 'rxjs';
import { cfFormatDate } from '@shared/utils/cf-intl.util';
import { TenantBillingService } from '@features/settings/billing/tenant-billing.service';
import { openRazorpayCheckout } from '@features/settings/billing/razorpay-checkout.util';
import { BillingHistoryComponent } from '@features/settings/billing/billing-history.component';

const FEATURE_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,63}$/;

export interface MySubscriptionSummary {
  status: string;
  access_mode?: 'full' | 'read_only';
  is_read_only?: boolean;
  plan_key?: string;
  plan_name: string;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  subscription_suspended_at?: string | null;
  grace_ends_at?: string | null;
  days_until_end?: number | null;
  grace_period_days?: number;
  expiring_warning_days?: number;
  allows_gated_access: boolean;
  max_users?: number;
  max_storage_mb?: number;
  features?: string[];
  gated_modules?: string[];
}

@Component({
  selector: 'app-my-subscription',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    LoadingSkeletonComponent,
    StatusBadgeComponent,
    CfEmptyStateComponent,
    CfCurrencyPipe,
    FormsModule,
    PlanComparisonComponent,
    PlanCompareTableComponent,
    PlanFeatureDetailsPanelComponent,
    ModalShellComponent,
    BillingHistoryComponent,
  ],
  templateUrl: './my-subscription.component.html',
  styleUrl: './my-subscription.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MySubscriptionComponent implements OnInit, OnDestroy {
  private tenantService = inject(TenantService);
  private subscriptions = inject(TenantSubscriptionService);
  private entitlements = inject(EntitlementService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private billing = inject(TenantBillingService);
  private destroy$ = new Subject<void>();

  loading = true;
  error: string | null = null;
  summary: MySubscriptionSummary | null = null;
  overview: TenantSubscriptionOverview | null = null;
  plans: PublicPlanCard[] = [];
  requests: UpgradeRequest[] = [];
  currentPlanIdentity: CurrentPlanIdentity | null = null;

  /** Feature the church was trying to use when it landed here (from the feature-unavailable page). */
  askedFeature: string | null = null;
  selectedPlan: PublicPlanCard | null = null;
  requestInterval: BillingInterval | null = null;
  requestMessage = '';
  submitting = false;
  requestError: string | null = null;
  comparisonError: string | null = null;
  featuresPlan: PublicPlanCard | null = null;
  featureCapabilitySections: FeatureCapabilitySection[] = [];
  planChangePreview: PlanChangePreview | null = null;
  planChangePreviewLoading = false;
  planChangePreviewError: string | null = null;
  private lastEntitlementPlanKey: string | null = null;

  billingAvailability: {
    can_quote?: boolean;
    can_checkout_online?: boolean;
    can_submit_offline_claim?: boolean;
  } | null = null;
  checkoutQuote: {
    gross: string;
    net: string;
    tax: string;
    currency_code: string;
    tax_label?: string;
    discount?: { type: string; amount_off?: string; list_price?: string };
    quote_expires_at?: string;
  } | null = null;
  checkoutQuoteLoading = false;
  checkoutQuoteError: string | null = null;
  checkoutBusy = false;
  checkoutError: string | null = null;
  offlineInvoiceId: number | null = null;
  offlineMethods: { code: string; label: string; instructions: { body?: string } | null }[] = [];
  offlineReference = '';
  offlineClaimBusy = false;
  offlineEvidenceFile: File | null = null;
  lastOfflineClaimId: number | null = null;

  ngOnInit(): void {
    const asked = this.route.snapshot.queryParamMap.get('request');
    this.askedFeature = asked && FEATURE_CODE_PATTERN.test(asked) ? asked.toUpperCase() : null;
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.summary = null;
    this.cdr.markForCheck();

    this.tenantService
      .getMySubscription()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.summary = res.data as MySubscriptionSummary;
            this.loadPlanDetails();
          } else {
            this.error = this.friendlyError(res.message, null);
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          const message = err?.message || err?.error?.message || null;
          const status = typeof err?.status === 'number' ? err.status : null;
          this.error = this.friendlyError(message, status);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /** Plan, usage, catalog and requests are extras: if any fail, the lifecycle view still shows. */
  private loadPlanDetails(): void {
    this.comparisonError = null;
    forkJoin({
      overview: this.subscriptions.overview().pipe(catchError(() => of(null))),
      billing: this.billing.availability().pipe(catchError(() => of(null))),
      comparison: this.subscriptions.comparison().pipe(
        catchError((err) => {
          this.comparisonError = subscriptionErrorMessage(err, 'Could not load plan comparison.');
          return of(null);
        }),
      ),
      requests: this.subscriptions.upgradeRequests().pipe(catchError(() => of([] as UpgradeRequest[]))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ overview, billing, comparison, requests }) => {
        this.overview = overview;
        this.billingAvailability = billing?.success
          ? (billing.data as {
              can_quote?: boolean;
              can_checkout_online?: boolean;
              can_submit_offline_claim?: boolean;
            })
          : null;
        const snapshot = comparison ?? overview?.comparison ?? null;
        this.currentPlanIdentity = snapshot?.current_plan ?? null;
        const planKey = `${this.currentPlanIdentity?.code ?? ''}|${this.currentPlanIdentity?.version_number ?? ''}`;
        if (this.lastEntitlementPlanKey && planKey && planKey !== this.lastEntitlementPlanKey) {
          this.entitlements.refresh().subscribe();
        }
        if (planKey) {
          this.lastEntitlementPlanKey = planKey;
        }
        this.plans = snapshot?.plans?.length ? snapshot.plans : [];
        this.featureCapabilitySections =
          snapshot?.feature_capability_sections?.length
            ? snapshot.feature_capability_sections
            : [];
        if (snapshot?.plans?.length) {
          this.comparisonError = null;
        }
        this.requests = requests;
        this.cdr.markForCheck();
      });
  }

  get planName(): string {
    return this.currentPlanIdentity?.name || this.overview?.plan?.name || this.summary?.plan_name || '—';
  }

  get currentPlanCode(): string | null {
    return this.currentPlanIdentity?.code ?? this.overview?.plan?.code ?? null;
  }

  get currentPlanUnmatched(): boolean {
    return !!this.currentPlanIdentity && this.currentPlanIdentity.matched === false;
  }

  get openRequest(): UpgradeRequest | null {
    return this.requests.find((r) => r.status === 'PENDING' || r.status === 'INFO_REQUESTED') ?? null;
  }

  /** A pending request blocks new ones; an info request lets the church answer by re-sending. */
  get canRequest(): boolean {
    return !this.submitting && this.openRequest?.status !== 'PENDING';
  }

  get enabledFeatures(): {
    code: string;
    name: string;
    description?: string | null;
    category: string;
    is_core: boolean;
  }[] {
    return (this.overview?.entitlements ?? []).filter((e) => e.enabled);
  }

  get enabledFeatureGroups(): { label: string; items: { code: string; name: string; description?: string | null }[] }[] {
    return groupByFeatureCategory(
      this.enabledFeatures.map((e) => ({
        ...e,
        display_order: 0,
      })),
    ).map((g) => ({ label: g.label, items: g.items }));
  }

  get askedFeatureName(): string | null {
    return this.askedFeature ? this.entitlements.featureName(this.askedFeature) : null;
  }

  intervalLabel(interval: string | null | undefined): string {
    switch (interval) {
      case 'MONTHLY':
        return 'per month';
      case 'ANNUAL':
        return 'per year';
      case 'CUSTOM':
        return 'custom agreement';
      default:
        return '';
    }
  }

  intervalOptionLabel(interval: BillingInterval): string {
    return interval === 'MONTHLY' ? 'Monthly' : interval === 'ANNUAL' ? 'Yearly' : 'Custom agreement';
  }

  usageText(row: UsageRow): string {
    if (row.unlimited || row.limit === null) {
      return `${row.usage.toLocaleString()} used · no limit`;
    }
    return `${row.usage.toLocaleString()} of ${row.limit.toLocaleString()} used`;
  }

  usagePercent(row: UsageRow): number {
    if (row.unlimited || row.limit === null || row.limit <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((row.usage / row.limit) * 100));
  }

  /** Text accompanies the bar colour so the level never depends on colour alone. */
  usageLevelLabel(level: UsageLevel): string {
    switch (level) {
      case 'notice':
        return 'Getting busy';
      case 'warning':
        return 'Nearly full';
      case 'critical':
        return 'Almost full';
      case 'at_limit':
        return 'Full';
      case 'over_limit':
        return 'Over the limit';
      default:
        return 'Plenty of room';
    }
  }

  requestStatusLabel(status: UpgradeRequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Waiting for review';
      case 'INFO_REQUESTED':
        return 'More information needed';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Not approved';
      default:
        return 'Cancelled';
    }
  }

  requestStatusTone(status: UpgradeRequestStatus): StatusBadgeTone {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
      case 'INFO_REQUESTED':
        return 'warning';
      case 'REJECTED':
        return 'critical';
      default:
        return 'neutral';
    }
  }

  openPlanFeatures(plan: PublicPlanCard): void {
    if (plan.coverage?.length) {
      this.featuresPlan = plan;
      this.cdr.markForCheck();
      return;
    }
    this.subscriptions
      .comparison()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (snapshot) => {
          const fresh = snapshot.plans.find((p) => p.code === plan.code) ?? plan;
          this.plans = snapshot.plans.length ? snapshot.plans : this.plans;
          this.featuresPlan = fresh;
          this.cdr.markForCheck();
        },
        error: () => {
          this.featuresPlan = plan;
          this.cdr.markForCheck();
        },
      });
  }

  closePlanFeatures(): void {
    this.featuresPlan = null;
    this.cdr.markForCheck();
  }

  choosePlan(plan: PublicPlanCard): void {
    if (plan.is_current || plan.primary_action === 'current') {
      return;
    }
    this.selectedPlan = plan;
    this.requestError = null;
    this.checkoutError = null;
    this.checkoutQuote = null;
    this.checkoutQuoteError = null;
    this.offlineInvoiceId = null;
    this.offlineMethods = [];
    this.planChangePreview = null;
    this.planChangePreviewError = null;
    const intervals = plan.billing_intervals ?? [];
    this.requestInterval = intervals.includes('ANNUAL') ? 'ANNUAL' : intervals[0] ?? null;
    this.loadPlanChangePreview(plan.code);
    if (this.billingSelfServeEnabled && plan.pricing_type !== 'CUSTOM') {
      this.loadCheckoutQuote();
    }
    this.cdr.markForCheck();
  }

  cancelRequest(): void {
    this.selectedPlan = null;
    this.planChangePreview = null;
    this.planChangePreviewError = null;
    this.requestError = null;
    this.checkoutQuote = null;
    this.checkoutError = null;
    this.offlineInvoiceId = null;
    this.cdr.markForCheck();
  }

  get billingSelfServeEnabled(): boolean {
    if (!this.billingAvailability) {
      return false;
    }
    return !!(
      this.billingAvailability.can_quote ||
      this.billingAvailability.can_checkout_online ||
      this.billingAvailability.can_submit_offline_claim
    );
  }

  get canPayOnline(): boolean {
    return !!this.billingAvailability?.can_checkout_online && !!this.checkoutQuote;
  }

  get canPayOffline(): boolean {
    return !!this.billingAvailability?.can_submit_offline_claim;
  }

  private checkoutInterval(): 'MONTHLY' | 'ANNUAL' | null {
    const interval = this.requestInterval;
    return interval === 'MONTHLY' || interval === 'ANNUAL' ? interval : null;
  }

  private loadCheckoutQuote(): void {
    const plan = this.selectedPlan;
    const interval = this.checkoutInterval();
    if (!plan || !interval || plan.pricing_type === 'CUSTOM') {
      return;
    }
    this.checkoutQuoteLoading = true;
    this.checkoutQuoteError = null;
    this.billing
      .quote(plan.code, interval)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.checkoutQuote = res.success ? (res.data as typeof this.checkoutQuote) : null;
          this.checkoutQuoteLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.checkoutQuote = null;
          this.checkoutQuoteLoading = false;
          this.checkoutQuoteError = subscriptionErrorMessage(err, 'Could not load checkout quote.');
          this.cdr.markForCheck();
        },
      });
  }

  onRequestIntervalChange(): void {
    if (this.billingSelfServeEnabled && this.selectedPlan) {
      this.loadCheckoutQuote();
    }
  }

  payOnline(): void {
    const plan = this.selectedPlan;
    const interval = this.checkoutInterval();
    if (!plan || !interval || this.checkoutBusy || !this.canPayOnline) {
      return;
    }
    this.checkoutBusy = true;
    this.checkoutError = null;
    this.cdr.markForCheck();
    const idempotencyKey = crypto.randomUUID();
    this.billing
      .createOrder(plan.code, interval, idempotencyKey)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res) => {
          if (!res.success || !res.data) {
            this.checkoutBusy = false;
            this.checkoutError = 'Could not start checkout.';
            this.cdr.markForCheck();
            return;
          }
          const payload = res.data as {
            order: { id: number };
            checkout: {
              public_key_id: string;
              provider_order_id: string;
              amount_minor: number;
              currency_code: string;
            };
          };
          try {
            await openRazorpayCheckout({
              publicKeyId: payload.checkout.public_key_id,
              providerOrderId: payload.checkout.provider_order_id,
              amountMinor: payload.checkout.amount_minor,
              currencyCode: payload.checkout.currency_code,
              name: 'EkklesiaNexus',
              description: `${plan.name} subscription`,
              onSuccess: (paymentId, signature) => {
                this.billing
                  .verifyOrder(payload.order.id, paymentId, signature)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: () => {
                      this.checkoutBusy = false;
                      this.selectedPlan = null;
                      this.toast.success('Payment received. Your subscription will update shortly.', 'Payment successful');
                      this.load();
                    },
                    error: (err) => {
                      this.checkoutBusy = false;
                      this.checkoutError = subscriptionErrorMessage(err, 'Payment verification failed. Contact support with your receipt.');
                      this.cdr.markForCheck();
                    },
                  });
              },
              onDismiss: () => {
                this.checkoutBusy = false;
                this.cdr.markForCheck();
              },
            });
          } catch {
            this.checkoutBusy = false;
            this.checkoutError = 'Could not open the payment window.';
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          this.checkoutBusy = false;
          this.checkoutError = subscriptionErrorMessage(err, 'Could not start checkout.');
          this.cdr.markForCheck();
        },
      });
  }

  closeOfflineClaimModal(): void {
    if (this.offlineClaimBusy) {
      return;
    }
    this.offlineInvoiceId = null;
    this.offlineEvidenceFile = null;
    this.offlineReference = '';
    this.cdr.markForCheck();
  }

  prepareOfflinePayment(): void {
    const plan = this.selectedPlan;
    const interval = this.checkoutInterval();
    if (!plan || !interval || this.checkoutBusy || !this.canPayOffline) {
      return;
    }
    this.checkoutBusy = true;
    this.checkoutError = null;
    this.cdr.markForCheck();
    const idempotencyKey = crypto.randomUUID();
    this.billing
      .createPayableOrder(plan.code, interval, idempotencyKey)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.checkoutBusy = false;
            this.checkoutError = 'Could not prepare offline payment.';
            this.cdr.markForCheck();
            return;
          }
          this.offlineInvoiceId = res.data.invoice_id;
          this.billing.offlineInstructions().pipe(take(1)).subscribe({
            next: (instr) => {
              this.offlineMethods = instr.data?.methods ?? [];
              this.checkoutBusy = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.checkoutBusy = false;
              this.checkoutError = 'Could not load payment instructions.';
              this.cdr.markForCheck();
            },
          });
        },
        error: (err) => {
          this.checkoutBusy = false;
          this.checkoutError = subscriptionErrorMessage(err, 'Could not prepare offline payment.');
          this.cdr.markForCheck();
        },
      });
  }

  offlineInstructionText(m: { instructions: { body?: string } | null }): string {
    if (m.instructions?.body) {
      return m.instructions.body;
    }
    return m.instructions ? JSON.stringify(m.instructions, null, 2) : '';
  }

  submitOfflineClaim(): void {
    if (!this.offlineInvoiceId || !this.checkoutQuote || this.offlineClaimBusy) {
      return;
    }
    const method = this.offlineMethods[0]?.code;
    if (!method) {
      this.checkoutError = 'No offline payment method is configured.';
      return;
    }
    this.offlineClaimBusy = true;
    this.checkoutError = null;
    this.billing
      .submitOfflineClaim({
        billing_invoice_id: this.offlineInvoiceId,
        method_code: method,
        claimed_amount: this.checkoutQuote.gross,
        currency_code: this.checkoutQuote.currency_code,
        reference_number: this.offlineReference.trim() || undefined,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.offlineClaimBusy = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          const claimId = (res.data as { id?: number })?.id;
          if (claimId && this.offlineEvidenceFile) {
            this.billing.uploadOfflineClaimEvidence(claimId, this.offlineEvidenceFile).pipe(take(1)).subscribe();
          }
          this.toast.success('Your payment claim was submitted for review.', 'Claim submitted');
          this.selectedPlan = null;
          this.offlineInvoiceId = null;
          this.offlineEvidenceFile = null;
        },
        error: (err) => {
          this.checkoutError = subscriptionErrorMessage(err, 'Could not submit your claim.');
        },
      });
  }

  get usingSubscribedVersion(): boolean {
    return !!this.currentPlanIdentity?.using_subscribed_version;
  }

  private loadPlanChangePreview(planCode: string): void {
    this.planChangePreviewLoading = true;
    this.planChangePreviewError = null;
    this.subscriptions
      .previewPlanChange(planCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (preview) => {
          this.planChangePreview = preview;
          this.planChangePreviewLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.planChangePreview = null;
          this.planChangePreviewLoading = false;
          this.planChangePreviewError = subscriptionErrorMessage(err, 'Could not load what would change on that plan.');
          this.cdr.markForCheck();
        },
      });
  }

  submitRequest(): void {
    const plan = this.selectedPlan;
    if (!plan || this.submitting) {
      return;
    }
    this.submitting = true;
    this.requestError = null;
    this.cdr.markForCheck();

    const featureCode =
      this.askedFeature && (plan.features ?? []).some((f) => f.code === this.askedFeature) ? this.askedFeature : null;

    this.subscriptions
      .submitUpgradeRequest({
        plan_code: plan.code,
        billing_interval: plan.pricing_type === 'CUSTOM' ? null : this.requestInterval,
        feature_code: featureCode,
        message: this.requestMessage.trim() || null,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ request, message }) => {
          this.requests = [request, ...this.requests.filter((r) => r.id !== request.id)];
          this.selectedPlan = null;
          this.requestMessage = '';
          this.toast.success(message, 'Request sent');
        },
        error: (err) => {
          this.requestError = subscriptionErrorMessage(err, 'We could not send your request. Please try again.');
        },
      });
  }

  trackByRequest(_index: number, request: UpgradeRequest): number {
    return request.id;
  }

  trackByUsage(_index: number, row: UsageRow): string {
    return row.code;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      TRIAL: 'Trial',
      ACTIVE: 'Active',
      LIFETIME: 'Lifetime',
      EXPIRING: 'Expiring soon',
      GRACE_PERIOD: 'Grace period',
      EXPIRED: 'Expired',
      SUSPENDED: 'Suspended',
    };
    return map[status] || status;
  }

  statusTone(status: string): StatusBadgeTone {
    switch (status) {
      case 'ACTIVE':
      case 'LIFETIME':
      case 'TRIAL':
        return 'success';
      case 'EXPIRING':
      case 'GRACE_PERIOD':
        return 'warning';
      case 'EXPIRED':
      case 'SUSPENDED':
        return 'critical';
      default:
        return 'neutral';
    }
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    try {
      return cfFormatDate(value) || value;
    } catch {
      return value;
    }
  }

  formatUsers(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    if (value >= 999999) {
      return 'Unlimited';
    }
    return value.toLocaleString();
  }

  formatStorage(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    if (value >= 1024) {
      const gb = value / 1024;
      const rounded = gb >= 10 ? Math.round(gb) : Math.round(gb * 10) / 10;
      return `${rounded.toLocaleString()} GB`;
    }
    return `${value.toLocaleString()} MB`;
  }

  /** Legacy module keys (shown only when the plan catalog is unavailable). */
  featureLabel(feature: string): string {
    return this.entitlements.featureName(feature);
  }

  showTrialField(summary: MySubscriptionSummary): boolean {
    if (summary.status === 'TRIAL') {
      return true;
    }
    if (!summary.trial_ends_at) {
      return false;
    }
    try {
      return new Date(summary.trial_ends_at).getTime() > Date.now();
    } catch {
      return false;
    }
  }

  subscriptionEndsLabel(summary: MySubscriptionSummary): string {
    if (summary.status === 'LIFETIME' || !summary.subscription_ends_at) {
      return 'No end date';
    }
    return this.formatDate(summary.subscription_ends_at);
  }

  accessHeadline(summary: MySubscriptionSummary): string {
    if (summary.status === 'EXPIRED' || summary.status === 'SUSPENDED') {
      return 'Read-only mode';
    }
    if (summary.allows_gated_access) {
      return 'Included features are available';
    }
    return 'Some features are unavailable';
  }

  accessDetail(summary: MySubscriptionSummary): string {
    switch (summary.status) {
      case 'EXPIRING':
        return summary.days_until_end != null
          ? `Your subscription ends in ${summary.days_until_end} day${summary.days_until_end === 1 ? '' : 's'}. Ask your administrator to renew access.`
          : 'Your subscription is ending soon. Ask your administrator to renew access.';
      case 'GRACE_PERIOD':
        return summary.grace_ends_at
          ? `Your end date has passed. Access continues until ${this.formatDate(summary.grace_ends_at)}. Contact your administrator to renew.`
          : 'Your end date has passed and you are in a grace period. Contact your administrator to renew.';
      case 'EXPIRED':
        return 'Your subscription has ended. You can view, print, and download records, but you cannot save changes. Contact EkklesiaNexus or your administrator to renew.';
      case 'SUSPENDED':
        return 'Subscription access is suspended. You can view records, but you cannot save changes. Contact EkklesiaNexus or your administrator.';
      case 'TRIAL':
        return summary.trial_ends_at
          ? `You are on a trial until ${this.formatDate(summary.trial_ends_at)}.`
          : 'You are on a trial plan.';
      case 'LIFETIME':
        return 'This church has lifetime access with no end date.';
      default:
        return summary.allows_gated_access
          ? 'Your church can use the features included in this plan.'
          : 'Contact your administrator if you need access restored.';
    }
  }

  showAccessNotice(summary: MySubscriptionSummary): boolean {
    return ['EXPIRING', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED'].includes(summary.status);
  }

  private friendlyError(message: string | null | undefined, status: number | null): string {
    if (status === 403) {
      return 'You do not have permission to view this church\'s subscription.';
    }
    if (status === 404) {
      return 'We could not find a subscription for this church.';
    }
    if (message && !/exception|stack|sql|internal server/i.test(message)) {
      return message;
    }
    return 'Unable to load subscription details. Please try again.';
  }
}
