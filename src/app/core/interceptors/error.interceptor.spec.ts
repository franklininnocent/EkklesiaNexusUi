import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { SupportSessionService } from '@features/support-center/services/support-session.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { of } from 'rxjs';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';

describe('errorInterceptor support session handling', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let invalidateSpy: jest.Mock;
  let toastError: jest.Mock;
  let routerNavigate: jest.Mock;

  beforeEach(() => {
    invalidateSpy = jest.fn().mockReturnValue(false);
    toastError = jest.fn();
    routerNavigate = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ToastService, useValue: { error: toastError } },
        { provide: AuthService, useValue: { clearAuthState: jest.fn(), getRefreshToken: () => null, getToken: () => null, refreshTokens: () => of({}) } },
        {
          provide: SupportSessionService,
          useValue: {
            invalidateIfMatchesCurrent: invalidateSpy,
          },
        },
        { provide: SubscriptionAccessService, useValue: { refresh: () => of(null) } },
        { provide: SubscriptionRestrictionService, useValue: { handleRestrictedAction: jest.fn() } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does not toast or redirect when 403 is for a stale session header', () => {
    http
      .get('/api/families/statistics', {
        headers: { 'X-Support-Session-Id': 'session-a' },
      })
      .subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/families/statistics');
    req.flush(
      { message: 'Support session is no longer active.' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(invalidateSpy).toHaveBeenCalledWith('session-a');
    expect(toastError).not.toHaveBeenCalled();
    expect(routerNavigate).not.toHaveBeenCalled();
  });

  it('toasts and redirects when the current session is invalidated', () => {
    invalidateSpy.mockReturnValue(true);

    http
      .get('/api/families/statistics', {
        headers: { 'X-Support-Session-Id': 'session-b' },
      })
      .subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/families/statistics');
    req.flush(
      { message: 'Support session is no longer active.' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(invalidateSpy).toHaveBeenCalledWith('session-b');
    expect(toastError).toHaveBeenCalled();
    expect(routerNavigate).toHaveBeenCalledWith(['/support-center']);
  });

  it('does not toast for support session events 403 even when invalidated', () => {
    invalidateSpy.mockReturnValue(true);

    http.post('/api/support/sessions/session-b/events', {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/support/sessions/session-b/events');
    req.flush(
      { message: 'Support session is no longer active.' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(invalidateSpy).toHaveBeenCalledWith('session-b');
    expect(toastError).not.toHaveBeenCalled();
    expect(routerNavigate).not.toHaveBeenCalled();
  });
});

describe('errorInterceptor plan errors', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastWarning: jest.Mock;
  let confirm: jest.Mock;
  let routerNavigate: jest.Mock;
  let canViewMySubscription: jest.Mock;

  beforeEach(() => {
    toastWarning = jest.fn();
    confirm = jest.fn().mockReturnValue(of({ confirmed: true }));
    routerNavigate = jest.fn().mockResolvedValue(true);
    canViewMySubscription = jest.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ToastService, useValue: { error: jest.fn(), warning: toastWarning } },
        { provide: AuthService, useValue: { clearAuthState: jest.fn(), canViewMySubscription, getRefreshToken: () => null, getToken: () => null, refreshTokens: () => of({}) } },
        { provide: ConfirmationDialogService, useValue: { confirm } },
        { provide: SupportSessionService, useValue: { invalidateIfMatchesCurrent: jest.fn() } },
        { provide: SubscriptionAccessService, useValue: { refresh: () => of(null) } },
        { provide: SubscriptionRestrictionService, useValue: { handleRestrictedAction: jest.fn() } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows a plain-language toast when a feature is not in the plan', () => {
    let received: any;
    http.get('/api/donations').subscribe({ error: (e) => (received = e) });

    httpMock.expectOne('/api/donations').flush(
      { success: false, code: 'FEATURE_NOT_AVAILABLE', feature: 'CONTRIBUTIONS', message: 'Donations are not in your plan.' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(toastWarning).toHaveBeenCalledWith('Donations are not in your plan.', 'Not in your plan');
    expect(confirm).not.toHaveBeenCalled();
    expect(received.code).toBe('FEATURE_NOT_AVAILABLE');
    expect(received.feature).toBe('CONTRIBUTIONS');
  });

  it('offers plan options when a limit is reached and opens My Subscription', () => {
    http.post('/api/families', {}).subscribe({ error: () => {} });

    httpMock.expectOne('/api/families').flush(
      { code: 'ENTITLEMENT_LIMIT_REACHED', message: 'People limit reached.', limit: 250, current_usage: 250 },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(confirm).toHaveBeenCalledTimes(1);
    const options = confirm.mock.calls[0][0];
    expect(options.title).toBe('Plan limit reached');
    expect(options.message).toContain('using 250 of 250');
    expect(options.confirmText).toBe('See plan options');
    expect(routerNavigate).toHaveBeenCalledWith(['/settings/my-subscription']);
  });

  it('tells staff who cannot see the plan to ask their administrator', () => {
    canViewMySubscription.mockReturnValue(false);
    http.post('/api/families', {}).subscribe({ error: () => {} });

    httpMock.expectOne('/api/families').flush(
      { code: 'ENTITLEMENT_LIMIT_REACHED', message: 'People limit reached.' },
      { status: 403, statusText: 'Forbidden' }
    );

    const options = confirm.mock.calls[0][0];
    expect(options.message).toContain('ask your church administrator');
    expect(options.confirmText).toBe('OK');
    expect(routerNavigate).not.toHaveBeenCalled();
  });

  it('maps validation errors onto the thrown ApiError without a generic validation label', () => {
    let received: { message?: string; errors?: Record<string, string[]>; status?: number } | undefined;
    http.post('/api/families', {}).subscribe({ error: (error) => (received = error) });

    httpMock.expectOne('/api/families').flush(
      { message: 'The given data was invalid.', errors: { email: ['Enter a valid email address.'] } },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(received?.status).toBe(422);
    expect(received?.message).toBe('Enter a valid email address.');
    expect(received?.errors?.['email'][0]).toBe('Enter a valid email address.');
  });

  it('hides SQL text on a server error', () => {
    let received: { message?: string } | undefined;
    http.get('/api/families').subscribe({ error: (error) => (received = error) });

    httpMock.expectOne('/api/families').flush(
      { message: 'SQLSTATE[23505]: duplicate key value violates unique constraint users_email_key' },
      { status: 500, statusText: 'Server Error' }
    );

    expect(received?.message).not.toContain('SQLSTATE');
    expect(received?.message).not.toContain('users_email_key');
  });

  it('does not toast a feature warning when the caller asked for a silent error', () => {
    http.get('/api/donations', { headers: { 'X-Silent-Error': '1' } }).subscribe({ error: () => {} });

    httpMock.expectOne('/api/donations').flush(
      { code: 'FEATURE_NOT_AVAILABLE', message: 'Donations are not in your plan.' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(toastWarning).not.toHaveBeenCalled();
  });
});

describe('errorInterceptor session refresh', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let refreshTokens: jest.Mock;
  let clearAuthState: jest.Mock;
  let toastError: jest.Mock;

  beforeEach(() => {
    refreshTokens = jest.fn().mockReturnValue(of({ access_token: 'next-token' }));
    clearAuthState = jest.fn();
    toastError = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ToastService, useValue: { error: toastError, warning: jest.fn() } },
        {
          provide: AuthService,
          useValue: {
            clearAuthState,
            canViewMySubscription: () => false,
            getRefreshToken: () => 'refresh-token',
            getToken: () => 'next-token',
            refreshTokens,
          },
        },
        { provide: SupportSessionService, useValue: { invalidateIfMatchesCurrent: jest.fn() } },
        { provide: ConfirmationDialogService, useValue: { confirm: jest.fn() } },
        { provide: SubscriptionAccessService, useValue: { refresh: () => of(null) } },
        { provide: SubscriptionRestrictionService, useValue: { handleRestrictedAction: jest.fn() } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('retries a safe GET once after a successful refresh and does not retry a payment', () => {
    let body: unknown;
    http.get('/api/families').subscribe((response) => (body = response));

    httpMock.expectOne('/api/families').flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(refreshTokens).toHaveBeenCalledTimes(1);
    const retried = httpMock.expectOne('/api/families');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer next-token');
    retried.flush({ success: true });
    expect(body).toEqual({ success: true });
    expect(clearAuthState).not.toHaveBeenCalled();

    http.post('/api/donations/payments', { amount: '10.00' }).subscribe({ error: () => {} });
    httpMock.expectOne('/api/donations/payments').flush(
      { message: 'Unauthenticated.' },
      { status: 401, statusText: 'Unauthorized' }
    );
    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(clearAuthState).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
    httpMock.verify();
  });
});
