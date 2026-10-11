import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';

const LOCKED_ALLOWED_PREFIXES = [
  '/settings/my-subscription',
  '/subscription-locked',
  '/auth/',
  '/profile',
];

export const subscriptionLockedGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const access = inject(SubscriptionAccessService);
  const router = inject(Router);

  const user = auth.currentUserValue;
  if (!user?.tenant_id) {
    return true;
  }

  const snap = access.snapshotSignal();
  if (!snap?.is_locked && snap?.access_mode !== 'locked') {
    return true;
  }

  const url = state.url.split('?')[0];
  if (LOCKED_ALLOWED_PREFIXES.some((p) => url.startsWith(p))) {
    return true;
  }

  return router.createUrlTree(['/subscription-locked']);
};
