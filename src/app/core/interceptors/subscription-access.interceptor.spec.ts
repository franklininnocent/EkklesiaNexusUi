import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/services/auth.service';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';
import { subscriptionAccessInterceptor } from './subscription-access.interceptor';

describe('subscriptionAccessInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { currentUserValue: { tenant_id: number } | null };
  let restriction: { handleRestrictedAction: jest.Mock };

  beforeEach(() => {
    authService = { currentUserValue: { tenant_id: 99 } };
    restriction = { handleRestrictedAction: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([subscriptionAccessInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        {
          provide: SubscriptionAccessService,
          useValue: { snapshotSignal: () => null },
        },
        { provide: SubscriptionRestrictionService, useValue: restriction },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('allows auth login while subscription snapshot is missing', (done) => {
    http.post('/api/auth/login', { email: 'a@b.com', password: 'secret' }).subscribe({
      next: () => done(),
      error: () => done.fail('login should not be blocked client-side'),
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush({ access_token: 't' });
  });

  it('does not treat a missing snapshot as a locked subscription', (done) => {
    http.get('/api/families').subscribe({
      next: () => done(),
      error: () => done.fail('a missing snapshot must not block parish reads'),
    });

    expect(restriction.handleRestrictedAction).not.toHaveBeenCalled();
    const req = httpMock.expectOne('/api/families');
    req.flush({ data: [] });
  });

  it('blocks tenant reads when the loaded snapshot is locked', (done) => {
    const access = TestBed.inject(SubscriptionAccessService) as unknown as {
      snapshotSignal: () => { access_mode: string };
    };
    access.snapshotSignal = () => ({ access_mode: 'locked' });

    http.get('/api/families').subscribe({
      next: () => done.fail('expected block'),
      error: (err: Error) => {
        expect(err.message).toBe('SUBSCRIPTION_BLOCKED_CLIENT');
        expect(restriction.handleRestrictedAction).toHaveBeenCalledWith('locked');
        done();
      },
    });
    httpMock.expectNone('/api/families');
  });
});
