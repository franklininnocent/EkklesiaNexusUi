import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { User } from '@core/models';
import { PhoneCodeService } from '@core/services/phone-code.service';
import { AuthService } from '@core/services/auth.service';
import { SupportSession } from '@features/support-center/models/support-access.model';
import { SupportSessionService } from '@features/support-center/services/support-session.service';
import { ActionAuthorizationService } from './action-authorization.service';

describe('ActionAuthorizationService', () => {
  let service: ActionAuthorizationService;
  let auth: AuthService;
  let session$: BehaviorSubject<SupportSession | null>;

  const baseUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 1,
      name: 'Reader',
      email: 'reader@parish.test',
      user_type: null,
      tenant_id: 42,
      active: 1,
      created_at: '',
      updated_at: '',
      role_name: 'Reader',
      permissions: [],
      ...overrides,
    }) as User;

  beforeEach(() => {
    session$ = new BehaviorSubject<SupportSession | null>(null);
    const supportSessionsMock = {
      session$,
      get currentSession() {
        return session$.value;
      },
      get isSessionLive() {
        return session$.value !== null;
      },
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        ActionAuthorizationService,
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: PhoneCodeService, useValue: { setPhoneCode: jest.fn() } },
        { provide: SupportSessionService, useValue: supportSessionsMock },
      ],
    });

    auth = TestBed.inject(AuthService);
    service = TestBed.inject(ActionAuthorizationService);
    (auth as unknown as { currentUserSubject: BehaviorSubject<User | null> }).currentUserSubject.next(null);
  });

  function signIn(user: User | null): void {
    (auth as unknown as { currentUserSubject: BehaviorSubject<User | null> }).currentUserSubject.next(user);
  }

  it('denies when the user is missing', () => {
    expect(service.ready).toBe(false);
    expect(service.allows('families.create')).toBe(false);
  });

  it('denies when permissions have not loaded', () => {
    signIn(baseUser({ permissions: undefined }));
    expect(service.ready).toBe(false);
    expect(service.allows('families.create')).toBe(false);
  });

  it('denies an empty permission list for a custom role', () => {
    signIn(baseUser({ permissions: [] }));
    expect(service.ready).toBe(true);
    expect(service.allows('families.create')).toBe(false);
  });

  it('allows a direct grant and denies a sibling action', () => {
    signIn(baseUser({ permissions: [{ name: 'users.delete' } as never] }));
    expect(service.allows('users.delete')).toBe(true);
    expect(service.allows('users.create')).toBe(false);
  });

  it('treats two users with the same role name independently', () => {
    signIn(baseUser({ role_name: 'Reader', permissions: [{ name: 'families.create' } as never] }));
    expect(service.allows('families.create')).toBe(true);

    signIn(baseUser({ role_name: 'Reader', permissions: [{ name: 'families.view' } as never] }));
    expect(service.allows('families.create')).toBe(false);
  });

  it('allows a tenant administrator on tenant and user gates without the slug', () => {
    signIn(baseUser({ role_name: 'Administrator', permissions: [] }));
    expect(service.allows('donations.collect')).toBe(true);
    expect(service.allows('users.create')).toBe(true);
  });

  it('denies users.create for a primary admin who is not a tenant administrator', () => {
    signIn(baseUser({ role_name: 'Reader', is_primary_admin: true, permissions: [] }));
    expect(service.allows('users.create')).toBe(false);
    expect(service.allows('families.create')).toBe(true);
  });

  it('denies mutations during a read-only support session and allows a view action', () => {
    signIn(
      baseUser({
        tenant_id: null,
        role_name: 'EkklesiaAdmin',
        has_ekklesia_role: true,
        permissions: [],
      })
    );
    session$.next({
      id: 'sess-1',
      support_user_id: 9,
      tenant_id: 42,
      mode: 'readonly',
      reason_code: 'diagnosis',
      status: 'active',
      started_at: '',
      expires_at: '',
    });

    expect(service.allows('donations.collect')).toBe(false);
    expect(service.allows('sacraments.view')).toBe(true);
  });

  it('allows mutations during a standard support session', () => {
    signIn(
      baseUser({
        tenant_id: null,
        role_name: 'EkklesiaAdmin',
        has_ekklesia_role: true,
        permissions: [],
      })
    );
    session$.next({
      id: 'sess-2',
      support_user_id: 9,
      tenant_id: 42,
      mode: 'standard',
      reason_code: 'diagnosis',
      status: 'active',
      started_at: '',
      expires_at: '',
    });

    expect(service.allows('donations.collect')).toBe(true);
  });

  it('clears access after logout', () => {
    signIn(baseUser({ permissions: [{ name: 'families.create' } as never] }));
    expect(service.allows('families.create')).toBe(true);
    signIn(null);
    expect(service.allows('families.create')).toBe(false);
  });

  it('denies an unknown action id', () => {
    signIn(baseUser({ role_name: 'Administrator', permissions: [] }));
    expect(service.allows('not.a.real.action')).toBe(false);
  });

  it('allowsAny and allowsAll fail closed', () => {
    signIn(baseUser({ permissions: [{ name: 'users.delete' } as never] }));
    expect(service.allowsAny(['users.create', 'users.delete'])).toBe(true);
    expect(service.allowsAll(['users.delete', 'users.create'])).toBe(false);
    expect(service.allowsAll([])).toBe(false);
  });
});
