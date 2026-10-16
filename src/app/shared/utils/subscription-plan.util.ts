import { EntitlementPlan } from '@core/services/entitlement.service';

/** Parish subscription catalog Starter tier (code `STARTER` or key `starter`). */
export function isStarterSubscriptionPlan(plan: EntitlementPlan | null | undefined): boolean {
  if (!plan) {
    return false;
  }
  const code = (plan.code ?? '').trim().toUpperCase();
  const key = (plan.key ?? '').trim().toLowerCase();
  return code === 'STARTER' || key === 'starter';
}
