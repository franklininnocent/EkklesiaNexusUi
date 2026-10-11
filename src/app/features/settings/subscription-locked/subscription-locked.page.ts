import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';

@Component({
  selector: 'app-subscription-locked-page',
  standalone: true,
  imports: [CommonModule, RouterModule, CfDatePipe],
  template: `
    <section class="locked-page cf-page">
      <div class="cf-panel locked-page__panel" role="alert">
        <h1>Account access restricted</h1>
        <p>
          Your subscription expired on
          <strong>{{ access.snapshotSignal()?.subscription_ends_at | cfDate }}</strong>.
          Your grace period ended on
          <strong>{{ access.snapshotSignal()?.grace_ends_at | cfDate }}</strong>.
          Renew your subscription to restore access to parish records.
        </p>
        <div class="locked-page__actions">
          <button type="button" class="cf-btn cf-btn-primary" (click)="renew()">Renew subscription</button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .locked-page {
        max-width: 36rem;
        margin: 0 auto;
      }

      .locked-page__panel {
        display: grid;
        gap: var(--cf-space-3);
        text-align: start;
      }

      h1 {
        margin: 0;
        font-size: var(--cf-text-page-title, 1.125rem);
        font-weight: 600;
        line-height: 1.3;
        color: var(--cf-slate-900);
      }

      p {
        margin: 0;
        font-size: var(--cf-text-body);
        line-height: 1.5;
        color: var(--cf-slate-700);
      }

      .locked-page__actions {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionLockedPageComponent {
  readonly access = inject(SubscriptionAccessService);
  private readonly restriction = inject(SubscriptionRestrictionService);

  renew(): void {
    this.restriction.navigateToRenew();
  }
}
