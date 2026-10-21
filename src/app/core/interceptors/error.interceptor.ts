import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, throwError } from 'rxjs';
import { ApiError, ApiErrorMessages } from '@core/errors/api-error';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { SupportSessionService } from '@features/support-center/services/support-session.service';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';

function isSupportSessionAuthFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('support session') ||
    normalized.includes('invalid support session') ||
    normalized.includes('session header does not match')
  );
}

function requestSupportSessionId(req: HttpRequest<unknown>): string | null {
  const headerId = req.headers.get('X-Support-Session-Id');
  if (headerId) {
    return headerId;
  }

  const match = /\/support\/sessions\/([^/]+)\/events/.exec(req.url);
  return match ? match[1] : null;
}

function isSupportSessionEventsRequest(url: string): boolean {
  return /\/support\/sessions\/[^/]+\/events/.test(url);
}

function isPublicPasswordRecoveryRequest(url: string): boolean {
  return url.includes('/auth/password/recovery/request');
}

function isAuthExchange(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/refresh') ||
    /\/refresh(?:\?|$)/.test(url) ||
    isPublicPasswordRecoveryRequest(url)
  );
}

function isSilent(req: HttpRequest<unknown>): boolean {
  return req.headers.get('X-Silent-Error') === '1';
}

function canRefresh(req: HttpRequest<unknown>): boolean {
  const method = req.method.toUpperCase();
  return (method === 'GET' || method === 'HEAD') && !isAuthExchange(req.url);
}

let planLimitDialogOpen = false;
let refreshInFlight: Observable<boolean> | null = null;
let sessionNoticeAt = 0;

function refreshSession(auth: AuthService): Observable<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) {
    return of(false);
  }
  refreshInFlight = auth.refreshTokens(refreshToken).pipe(
    map(() => true),
    catchError(() => of(false)),
    finalize(() => {
      refreshInFlight = null;
    }),
    shareReplay(1)
  );
  return refreshInFlight;
}

function notifySessionExpired(auth: AuthService, toast: ToastService, silent: boolean): ApiError {
  const now = Date.now();
  if (!silent && now - sessionNoticeAt > 2000) {
    toast.error(ApiErrorMessages.sessionExpired, 'Session expired', 8000);
    sessionNoticeAt = now;
  }
  auth.clearAuthState();
  const error = new ApiError({
    message: ApiErrorMessages.sessionExpired,
    category: 'authentication',
    status: 401,
    code: 'UNAUTHENTICATED',
    handled: !silent,
  });
  return error;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const supportSessions = inject(SupportSessionService);
  const dialogs = inject(ConfirmationDialogService);
  const subscriptionAccess = inject(SubscriptionAccessService);
  const subscriptionRestriction = inject(SubscriptionRestrictionService);
  const silent = isSilent(req);

  const showPlanLimitDialog = (message: string, limit: unknown, usage: unknown): void => {
    if (planLimitDialogOpen || silent) return;
    planLimitDialogOpen = true;
    const canSeePlan = auth.canViewMySubscription();
    const usageLine =
      typeof usage === 'number' && typeof limit === 'number' ? ` Your church is using ${usage} of ${limit}.` : '';
    dialogs
      .confirm({
        title: 'Plan limit reached',
        message:
          `${message}${usageLine} ` +
          (canSeePlan
            ? 'You can see plan options and request an upgrade from My Subscription.'
            : 'Please ask your church administrator about a larger plan.'),
        confirmText: canSeePlan ? 'See plan options' : 'OK',
        cancelText: canSeePlan ? 'Not now' : 'Close',
      })
      .subscribe((result) => {
        planLimitDialogOpen = false;
        if (result.confirmed && canSeePlan) {
          void router.navigate(['/settings/my-subscription']);
        }
      });
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && canRefresh(req)) {
        return refreshSession(auth).pipe(
          switchMap((refreshed) => {
            if (!refreshed) {
              return throwError(() => notifySessionExpired(auth, toast, silent));
            }
            const token = auth.getToken();
            const retry = token
              ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
              : req;
            return next(retry);
          })
        );
      }

      const apiError = ApiError.fromHttp(error, req);

      if (error.status === 401 && !isAuthExchange(req.url)) {
        return throwError(() => notifySessionExpired(auth, toast, silent));
      }

      if (error.status === 403 && !silent) {
        const code = apiError.code;
        const reason = apiError.reason;
        if (code === 'FEATURE_NOT_AVAILABLE') {
          toast.warning(apiError.message, 'Not in your plan');
          apiError.handled = true;
        } else if (code === 'ENTITLEMENT_LIMIT_REACHED') {
          showPlanLimitDialog(apiError.message, apiError.limit, apiError.current_usage);
          apiError.handled = true;
        } else if (code === 'SUBSCRIPTION_VIEW_ONLY' || code === 'SUBSCRIPTION_LOCKED') {
          subscriptionAccess.refresh().subscribe();
          subscriptionRestriction.handleRestrictedAction(code === 'SUBSCRIPTION_LOCKED' ? 'locked' : 'view_only');
          apiError.handled = true;
        } else if (reason === 'subscription_blocked' || code === 'SUBSCRIPTION_READ_ONLY' || code === 'SUBSCRIPTION_EXPIRED') {
          toast.error(apiError.message, 'Read-only');
          apiError.handled = true;
        } else if (isSupportSessionAuthFailure(apiError.message)) {
          const invalidated = supportSessions.invalidateIfMatchesCurrent(requestSupportSessionId(req));
          if (invalidated && !isSupportSessionEventsRequest(req.url)) {
            toast.error(
              'Your support session is no longer valid. Start a new session from Support Center.',
              'Support session ended'
            );
            apiError.handled = true;
            if (!req.url.includes('/support-center')) {
              void router.navigate(['/support-center']);
            }
          }
        }
      }

      console.error('HTTP Error:', apiError.status, apiError.code || apiError.category, apiError.requestId || '');

      return throwError(() => apiError);
    })
  );
};
