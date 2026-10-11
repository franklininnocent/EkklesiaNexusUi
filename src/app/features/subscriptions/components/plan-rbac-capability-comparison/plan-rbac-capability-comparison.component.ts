import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RbacCapabilityRow } from '../../models/subscription-admin.models';

@Component({
  selector: 'app-plan-rbac-capability-comparison',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rbac-compare" aria-labelledby="rbac-compare-title">
      <h3 id="rbac-compare-title" class="rbac-compare__title">Roles &amp; permissions: what changes between plans</h3>
      <p class="rbac-compare__intro">
        <strong>Roles &amp; Permissions</strong> covers viewing roles and assigning staff to existing roles.
        <strong>Advanced Roles &amp; Permissions</strong> adds custom roles and editing which permissions each role has.
      </p>
      <ul class="rbac-compare__list">
        <li *ngFor="let row of rows()" class="rbac-compare__row">
          <div class="rbac-compare__head">
            <span class="rbac-compare__label">{{ row.label }}</span>
            <span class="rbac-compare__tier" [class.rbac-compare__tier--advanced]="row.entitlement === 'RBAC_ADVANCED'">
              {{ row.entitlement === 'RBAC_ADVANCED' ? 'Advanced plan' : 'Standard plan' }}
            </span>
          </div>
          <p class="rbac-compare__note">{{ row.customer_note }}</p>
        </li>
      </ul>
    </section>
  `,
  styles: [
    `
      .rbac-compare {
        margin-top: var(--spacing-md, 1rem);
        padding: var(--spacing-md, 1rem);
        border: 1px solid var(--cf-panel-border, var(--gray-200));
        border-radius: var(--cf-radius, var(--radius-md));
        background: var(--cf-panel-muted-bg, var(--gray-50));
      }
      .rbac-compare__title {
        margin: 0 0 0.35rem;
        font-size: var(--font-size-md, 1rem);
      }
      .rbac-compare__intro {
        margin: 0 0 0.75rem;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--cf-muted, var(--text-secondary));
      }
      .rbac-compare__list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .rbac-compare__row {
        padding: 0.5rem 0;
        border-top: 1px solid var(--cf-panel-border, var(--gray-200));
      }
      .rbac-compare__head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.35rem;
        align-items: baseline;
      }
      .rbac-compare__label {
        font-weight: 600;
        font-size: var(--font-size-sm, 0.875rem);
      }
      .rbac-compare__tier {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--cf-muted, var(--text-secondary));
      }
      .rbac-compare__tier--advanced {
        color: var(--cf-primary, var(--primary-color));
      }
      .rbac-compare__note {
        margin: 0.2rem 0 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--cf-muted, var(--text-secondary));
      }
    `,
  ],
})
export class PlanRbacCapabilityComparisonComponent {
  readonly rows = input.required<RbacCapabilityRow[]>();
}
