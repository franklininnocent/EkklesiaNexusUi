import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureCapabilitySection } from '../../models/subscription-admin.models';

@Component({
  selector: 'app-plan-feature-capability-sections',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cap-sections" *ngIf="sections().length">
      <section
        *ngFor="let section of sections(); trackBy: trackSection"
        class="cap-section"
        [attr.aria-labelledby]="'cap-' + section.id">
        <h3 class="cap-section__title" [id]="'cap-' + section.id">{{ section.title }}</h3>
        <p class="cap-section__intro" *ngIf="section.intro">{{ section.intro }}</p>
        <ul class="cap-section__list">
          <li *ngFor="let row of section.rows" class="cap-section__row">
            <div class="cap-section__head">
              <span class="cap-section__label">{{ row.label }}</span>
              <span class="cap-section__tier" [class.cap-section__tier--upgrade]="isUpgradeTier(row.entitlement)">
                {{ tierLabel(row.entitlement) }}
              </span>
            </div>
            <p class="cap-section__note">{{ row.customer_note }}</p>
          </li>
        </ul>
      </section>
    </div>
  `,
  styles: [
    `
      .cap-sections {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md, 1rem);
        margin-top: var(--spacing-md, 1rem);
      }
      .cap-section {
        padding: var(--spacing-md, 1rem);
        border: 1px solid var(--cf-panel-border, var(--gray-200));
        border-radius: var(--cf-radius, var(--radius-md));
        background: var(--cf-panel-muted-bg, var(--gray-50));
      }
      .cap-section__title {
        margin: 0 0 0.35rem;
        font-size: var(--font-size-md, 1rem);
      }
      .cap-section__intro {
        margin: 0 0 0.75rem;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--cf-muted, var(--text-secondary));
      }
      .cap-section__list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .cap-section__row {
        padding: 0.5rem 0;
        border-top: 1px solid var(--cf-panel-border, var(--gray-200));
      }
      .cap-section__head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.35rem;
        align-items: baseline;
      }
      .cap-section__label {
        font-weight: 600;
        font-size: var(--font-size-sm, 0.875rem);
      }
      .cap-section__tier {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--cf-muted, var(--text-secondary));
      }
      .cap-section__tier--upgrade {
        color: var(--cf-primary, var(--primary-color));
      }
      .cap-section__note {
        margin: 0.2rem 0 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--cf-muted, var(--text-secondary));
      }
    `,
  ],
})
export class PlanFeatureCapabilitySectionsComponent {
  readonly sections = input<FeatureCapabilitySection[]>([]);

  trackSection(_: number, section: FeatureCapabilitySection): string {
    return section.id;
  }

  isUpgradeTier(entitlement: string): boolean {
    return (
      entitlement.includes('ADVANCED') ||
      entitlement === 'FINANCIAL_DASHBOARD' ||
      entitlement === 'CONTRIBUTION_PLANS'
    );
  }

  tierLabel(entitlement: string): string {
    return this.isUpgradeTier(entitlement) ? 'Higher-tier plan' : 'Standard in plan';
  }
}
