import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PlanCoverageRow,
  VersionPreview,
} from '../../models/subscription-admin.models';
import { groupByFeatureCategory } from '../../utils/subscription-feature-category.util';

const NUMERIC = new Set(['LIMIT', 'QUOTA', 'USAGE']);

@Component({
  selector: 'app-plan-feature-details-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plan-features" *ngIf="groups().length; else empty">
      <section *ngFor="let group of groups()" class="plan-features__group" [attr.aria-labelledby]="'pf-' + group.category">
        <h3 class="plan-features__category" [id]="'pf-' + group.category">{{ group.label }}</h3>
        <ul class="plan-features__list">
          <li *ngFor="let row of group.items" class="plan-features__row" [class.plan-features__row--off]="!rowIncluded(row)">
            <div class="plan-features__head">
              <strong>{{ row.name }}</strong>
              <span class="plan-features__state">{{ stateLabel(row) }}</span>
            </div>
            <p class="plan-features__desc" *ngIf="row.description; else noDesc">{{ row.description }}</p>
            <ng-template #noDesc>
              <p class="plan-features__desc plan-features__desc--muted">No description available.</p>
            </ng-template>
          </li>
        </ul>
      </section>
    </div>
    <ng-template #empty>
      <p class="plan-features__empty">No feature details are available for this plan.</p>
    </ng-template>
  `,
  styles: [
    `
      .plan-features {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md, 1rem);
        max-height: min(70vh, 32rem);
        overflow: auto;
      }
      .plan-features__category {
        margin: 0 0 0.35rem;
        font-size: var(--font-size-sm, 0.875rem);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--cf-muted, var(--text-secondary));
      }
      .plan-features__list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .plan-features__row {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--cf-panel-border, var(--gray-200));
      }
      .plan-features__row--off {
        opacity: 0.85;
      }
      .plan-features__head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.35rem;
        align-items: baseline;
      }
      .plan-features__state {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        color: var(--cf-muted, var(--text-secondary));
      }
      .plan-features__desc {
        margin: 0.25rem 0 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--cf-muted, var(--text-secondary));
      }
      .plan-features__desc--muted {
        font-style: italic;
      }
      .plan-features__empty {
        margin: 0;
        color: var(--cf-muted, var(--text-secondary));
      }
    `,
  ],
})
export class PlanFeatureDetailsPanelComponent {
  readonly preview = input<VersionPreview | null>(null);
  readonly coverage = input<PlanCoverageRow[] | null>(null);

  readonly groups = computed(() => {
    const fromCoverage = this.coverage();
    if (fromCoverage && fromCoverage.length > 0) {
      return groupByFeatureCategory(fromCoverage);
    }
    const p = this.preview();
    if (!p) {
      return [];
    }
    const rows: PlanCoverageRow[] = [
      ...p.modules.map((m) => ({
        code: m.code,
        name: m.name,
        description: m.description ?? null,
        category: m.category,
        feature_type: 'BOOLEAN' as const,
        unit: null,
        display_order: null,
        is_core: m.is_core,
        included: m.enabled,
        value: null,
        unlimited: false,
      })),
      ...p.limits.map((l) => ({
        code: l.code,
        name: l.name,
        description: l.description ?? null,
        category: 'limits',
        feature_type: 'LIMIT' as const,
        unit: l.unit,
        display_order: null,
        is_core: false,
        included: l.included ?? true,
        value: l.value,
        unlimited: l.unlimited,
      })),
    ];
    return groupByFeatureCategory(rows);
  });

  rowIncluded(row: PlanCoverageRow): boolean {
    return row.included;
  }

  stateLabel(row: PlanCoverageRow): string {
    if (row.is_core) {
      return 'Always included';
    }
    if (NUMERIC.has(row.feature_type)) {
      if (!row.included) {
        return 'Not included';
      }
      if (row.unlimited) {
        return 'Unlimited';
      }
      if (row.value === null || row.value === undefined) {
        return 'Not configured';
      }
      return `${row.value.toLocaleString()}${row.unit ? ' ' + row.unit : ''}`;
    }
    return row.included ? 'Included' : 'Not included';
  }
}
