import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { canScheduleMasses } from '../utils/mass-intentions-auth.util';

export const massSchedulePermissionGuard: CanActivateFn = () => {
  const actions = inject(ActionAuthorizationService);
  const router = inject(Router);
  if (canScheduleMasses(actions)) {
    return true;
  }
  return router.createUrlTree(['/mass-intentions/masses'], {
    queryParams: { schedule_denied: '1' },
  });
};
