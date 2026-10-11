import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import {
  FeatureCapabilitySection,
  PlanCoverageRow,
  PublicPlanCard,
} from '../../models/subscription-admin.models';
import { groupByFeatureCategory, subscriptionFeatureCategoryLabel } from '../../utils/subscription-feature-category.util';

const NUMERIC = new Set(['LIMIT', 'QUOTA', 'USAGE']);

interface CompareRow {
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  feature_type: string;
}

interface CapabilityTableRow {
  code: string;
  label: string;
  note: string;
}

interface CapabilityTableGroup {
  id: string;
  title: string;
  intro: string;
  rows: CapabilityTableRow[];
}

@Component({
  selector: 'app-plan-compare-table',
  standalone: true,
  imports: [CommonModule, CfCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-compare-table.component.html',
  styleUrl: './plan-compare-table.component.scss',
})
export class PlanCompareTableComponent {
  readonly plans = input<PublicPlanCard[]>([]);
  readonly currentCode = input<string | null>(null);
  readonly capabilitySections = input<FeatureCapabilitySection[]>([]);

  readonly rows = computed<CompareRow[]>(() => {
    const plans = this.plans();
    const first = plans.find((p) => p.coverage?.length)?.coverage;
    if (!first?.length) {
      return [];
    }
    return first.map((r) => ({
      code: r.code,
      name: r.name,
      category: r.category,
      categoryLabel: subscriptionFeatureCategoryLabel(r.category),
      feature_type: r.feature_type,
    }));
  });

  readonly capabilityGroups = computed<CapabilityTableGroup[]>(() =>
    this.capabilitySections().map((section) => ({
      id: section.id,
      title: section.title,
      intro: section.intro,
      rows: section.rows.map((row) => ({
        code: row.entitlement,
        label: row.label,
        note: row.customer_note,
      })),
    })),
  );

  readonly limitGroups = computed(() =>
    groupByFeatureCategory(
      this.rows()
        .filter((r) => NUMERIC.has(r.feature_type))
        .map((r) => ({ ...r, display_order: 0, category: r.category })),
    ),
  );

  readonly catalogGroups = computed(() =>
    groupByFeatureCategory(
      this.rows()
        .filter((r) => !NUMERIC.has(r.feature_type))
        .map((r) => ({ ...r, display_order: 0, category: r.category })),
    ),
  );

  readonly showCatalogFallback = computed(
    () => this.capabilityGroups().length === 0 && this.catalogGroups().length > 0,
  );

  hasTableBody(): boolean {
    return (
      this.capabilityGroups().length > 0 ||
      this.limitGroups().length > 0 ||
      this.showCatalogFallback()
    );
  }

  isCurrent(plan: PublicPlanCard): boolean {
    const code = this.currentCode();
    return plan.is_current === true || (!!code && plan.code === code);
  }

  showPlanPrice(plan: PublicPlanCard): boolean {
    if (plan.pricing_type === 'CUSTOM') {
      return false;
    }
    if (this.isCurrent(plan) && plan.is_lifetime) {
      return false;
    }
    return !!(plan.monthly_price || plan.annual_price);
  }

  coverageFor(plan: PublicPlanCard, code: string): PlanCoverageRow | undefined {
    return plan.coverage?.find((c) => c.code === code);
  }

  cellIncluded(plan: PublicPlanCard, code: string): boolean {
    const c = this.coverageFor(plan, code);
    if (!c) {
      return false;
    }
    if (c.is_core) {
      return true;
    }
    if (NUMERIC.has(String(c.feature_type))) {
      return c.included;
    }
    return c.included;
  }

  cellText(plan: PublicPlanCard, row: CompareRow): string {
    const c = this.coverageFor(plan, row.code);
    if (!c) {
      return '—';
    }
    if (c.is_core) {
      return '✓';
    }
    if (NUMERIC.has(c.feature_type)) {
      if (!c.included) {
        return '—';
      }
      if (c.unlimited) {
        return 'Unlimited';
      }
      if (c.value === null || c.value === undefined) {
        return '—';
      }
      return c.value.toLocaleString();
    }
    return c.included ? '✓' : '—';
  }

  featureDescription(code: string): string | null {
    const c = this.plans()
      .map((p) => this.coverageFor(p, code))
      .find((row) => row?.description);
    return c?.description ?? null;
  }

  cellAria(plan: PublicPlanCard, code: string, label: string): string {
    const included = this.cellIncluded(plan, code);
    return included ? `${label} included in ${plan.name}` : `${label} not included in ${plan.name}`;
  }

  trackPlan(_: number, plan: PublicPlanCard): string {
    return plan.code;
  }

  trackGroup(_: number, group: CapabilityTableGroup): string {
    return group.id;
  }

  trackGroupCatalog(_: number, group: { label: string }): string {
    return group.label;
  }

  trackRow(_: number, row: { code: string }): string {
    return row.code;
  }
}
