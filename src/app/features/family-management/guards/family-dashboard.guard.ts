import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { EntitlementService } from '@core/services/entitlement.service';
import { isStarterSubscriptionPlan } from '@shared/utils/subscription-plan.util';

/**
 * Starter parishes use the family list as the module home; analytics dashboard is for Standard+.
 */
export const familyDashboardGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): Observable<boolean | UrlTree> => {
  const entitlements = inject(EntitlementService);
  const router = inject(Router);

  if (!entitlements.appliesToCurrentUser()) {
    return of(true);
  }

  return entitlements.load().pipe(
    map(() => {
      if (!isStarterSubscriptionPlan(entitlements.plan())) {
        return true;
      }
      return router.createUrlTree(['/families/list'], {
        queryParams: route.queryParams,
      });
    }),
  );
};
