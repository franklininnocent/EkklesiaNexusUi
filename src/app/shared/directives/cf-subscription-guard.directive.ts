import { Directive, inject } from '@angular/core';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';

/**
 * Intercepts clicks when subscription blocks mutations; opens the restriction modal
 * without hiding the control (Grandma Test: visible actions with clear feedback).
 */
@Directive({
  selector: '[cfSubscriptionGuard]',
  standalone: true,
  host: {
    '(click.capture)': 'onClick($event)',
  },
})
export class CfSubscriptionGuardDirective {
  private readonly access = inject(SubscriptionAccessService);
  private readonly restriction = inject(SubscriptionRestrictionService);

  onClick(event: Event): void {
    if (!this.access.blocksMutations()) {
      return;
    }

    if (!this.restriction.handleRestrictedAction()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
