import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { EntitlementService } from '@core/services/entitlement.service';
import { sacramentsDashboardGuard } from './sacraments-dashboard.guard';

describe('sacramentsDashboardGuard', () => {
  let applies: boolean;
  let plan: { code: string | null; key: string | null; name: string; pricing_type: string; is_legacy: boolean; version_number: number } | null;
  const entitlements = {
    appliesToCurrentUser: () => applies,
    load: jest.fn(() => of(null)),
    plan: () => plan,
  };

  function route(queryParams: Record<string, string> = {}): ActivatedRouteSnapshot {
    return { queryParams } as unknown as ActivatedRouteSnapshot;
  }

  function run(queryParams?: Record<string, string>): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
      firstValueFrom(
        sacramentsDashboardGuard(route(queryParams), {} as RouterStateSnapshot) as Observable<boolean | UrlTree>,
      ),
    );
  }

  beforeEach(() => {
    applies = true;
    plan = { code: 'PROFESSIONAL', key: 'professional', name: 'Professional', pricing_type: 'FIXED', is_legacy: false, version_number: 1 };
    entitlements.load.mockClear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: EntitlementService, useValue: entitlements }],
    });
  });

  it('allows the dashboard for Standard, Professional, and Enterprise plans', async () => {
    expect(await run()).toBe(true);
    plan = { code: 'STANDARD', key: 'standard', name: 'Standard', pricing_type: 'FIXED', is_legacy: false, version_number: 1 };
    expect(await run()).toBe(true);
  });

  it('allows the dashboard for platform users without loading entitlements', async () => {
    applies = false;
    plan = { code: 'STARTER', key: 'starter', name: 'Starter', pricing_type: 'FIXED', is_legacy: false, version_number: 1 };
    expect(await run()).toBe(true);
    expect(entitlements.load).not.toHaveBeenCalled();
  });

  it('redirects Starter parishes to the sacramental register', async () => {
    plan = { code: 'STARTER', key: 'starter', name: 'Starter', pricing_type: 'FIXED', is_legacy: false, version_number: 1 };
    const result = await run({ status: 'registered' });
    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/sacraments/register?status=registered');
  });
});
