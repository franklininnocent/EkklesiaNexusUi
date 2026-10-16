import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';

const RECOVERY_PATH_FRAGMENTS = [
  '/auth/login',
  '/auth/register',
  '/auth/get-user',
  '/auth/refresh',
  '/auth/logout',
  '/auth/password/',
  '/subscription-access',
  '/my-subscription',
  '/subscription/upgrade-requests',
  '/donations/webhooks/',
];

const READ_ONLY_POST_FRAGMENTS = ['/persons/matches'];

const GENERATION_PATH_FRAGMENTS = [
  '/export/bulk',
  '/reports/export',
  '/reports/exports/',
  '/reports/print',
  '/reports/stewardship/print',
  '/reports/executive-board/print',
  '/financial-profile/print',
  '/receipt/print',
  '/certificates/preview',
  '/certificates/latest/download',
  '/certificates/',
  '/mass-intentions/requests/export/pdf',
  '/files/signed-url',
];

function pathOf(req: HttpRequest<unknown>): string {
  try {
    const url = new URL(req.url, window.location.origin);
    return url.pathname;
  } catch {
    return req.url;
  }
}

function matchesAny(path: string, fragments: string[]): boolean {
  return fragments.some((f) => path.includes(f));
}

function isRecovery(req: HttpRequest<unknown>): boolean {
  const path = pathOf(req);
  return matchesAny(path, RECOVERY_PATH_FRAGMENTS);
}

function isReadOnlyPost(req: HttpRequest<unknown>): boolean {
  if (req.method !== 'POST') {
    return false;
  }
  return matchesAny(pathOf(req), READ_ONLY_POST_FRAGMENTS);
}

function isGeneration(req: HttpRequest<unknown>): boolean {
  const path = pathOf(req);
  if (req.method === 'GET' && path.includes('/reports/exports') && !path.includes('/download')) {
    return false;
  }
  return matchesAny(path, GENERATION_PATH_FRAGMENTS);
}

export const subscriptionAccessInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const access = inject(SubscriptionAccessService);
  const restriction = inject(SubscriptionRestrictionService);

  const user = auth.currentUserValue;
  if (!user?.tenant_id) {
    return next(req);
  }

  if (isRecovery(req)) {
    return next(req);
  }

  const snap = access.snapshotSignal();
  // A missing snapshot is unknown, not locked. Treating it as locked shows
  // "Account Access Restricted" to churches that still have full access
  // (including lifetime plans) while the snapshot request is in flight.
  // The API remains the authority until a snapshot has loaded.
  const mode = snap?.access_mode;
  if (!mode) {
    return next(req);
  }

  const blocked =
    mode === 'locked' ||
    mode === 'view_only' ||
    mode === 'read_only';

  if (!blocked) {
    return next(req);
  }

  if (mode === 'locked' && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    restriction.handleRestrictedAction('locked');
    return throwError(() => new Error('SUBSCRIPTION_BLOCKED_CLIENT'));
  }

  if (mode === 'locked' && (req.method === 'GET' || req.method === 'HEAD')) {
    restriction.handleRestrictedAction('locked');
    return throwError(() => new Error('SUBSCRIPTION_BLOCKED_CLIENT'));
  }

  if (isGeneration(req)) {
    restriction.handleRestrictedAction(mode === 'view_only' ? 'view_only' : 'read_only');
    return throwError(() => new Error('SUBSCRIPTION_BLOCKED_CLIENT'));
  }

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (isMutation && !isReadOnlyPost(req)) {
    restriction.handleRestrictedAction(mode === 'view_only' ? 'view_only' : 'read_only');
    return throwError(() => new Error('SUBSCRIPTION_BLOCKED_CLIENT'));
  }

  return next(req);
};
