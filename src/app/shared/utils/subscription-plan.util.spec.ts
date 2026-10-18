import { isStarterSubscriptionPlan } from './subscription-plan.util';

describe('isStarterSubscriptionPlan', () => {
  it('matches Starter by catalog code or key only', () => {
    expect(
      isStarterSubscriptionPlan({
        code: 'STARTER',
        key: null,
        name: 'Starter',
        pricing_type: 'FIXED',
        is_legacy: false,
        version_number: 1,
      }),
    ).toBe(true);
    expect(
      isStarterSubscriptionPlan({
        code: null,
        key: 'starter',
        name: 'Starter',
        pricing_type: 'FIXED',
        is_legacy: false,
        version_number: 1,
      }),
    ).toBe(true);
    expect(
      isStarterSubscriptionPlan({
        code: 'PROFESSIONAL',
        key: 'professional',
        name: 'Professional',
        pricing_type: 'FIXED',
        is_legacy: false,
        version_number: 1,
      }),
    ).toBe(false);
    expect(isStarterSubscriptionPlan(null)).toBe(false);
  });
});
