import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs/operators';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { User } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import * as AuthActions from '@core/store/auth/auth.actions';
import { selectCurrentUser } from '@core/store/auth/auth.selectors';

/**
 * Route guard for a catalog action id in route data (`permissionAction`).
 * Hiding a menu item is not a substitute for this check.
 */
export const permissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const authz = inject(ActionAuthorizationService);
  const router = inject(Router);
  const store = inject(Store);

  if (!authService.isAuthenticated()) {
    void router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (!authService.currentUserValue) {
    store.dispatch(AuthActions.loadUser());
  }

  return store.select(selectCurrentUser).pipe(
    filter((user): user is User => !!user),
    take(1),
    map(() => {
      const actionId = route.data?.['permissionAction'];
      if (typeof actionId === 'string' && authz.allows(actionId)) {
        return true;
      }

      void router.navigate(['/dashboard'], {
        queryParams: {
          error: 'forbidden',
          message: 'You do not have permission to open this page.',
        },
      });
      return false;
    })
  );
};
