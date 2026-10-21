import { APIResponse, expect, Page } from '@playwright/test';

export interface SubscriptionAccessSnapshot {
  status: string;
  effective_status?: string;
  access_mode?: string;
  is_read_only?: boolean;
  is_view_only?: boolean;
  is_locked?: boolean;
  view_only_locked_enforcement?: boolean;
}

/** Parish has full stewardship configure access (matches SubscriptionAccessService full mode). */
export function skipUnlessActiveSubscriptionAccess(
  snapshot: SubscriptionAccessSnapshot,
): string | false {
  if (snapshot.status === 'EXPIRED') {
    return 'Tenant subscription is EXPIRED';
  }
  if (snapshot.is_locked || snapshot.access_mode === 'locked') {
    return 'Tenant subscription is locked';
  }
  if (snapshot.is_view_only || snapshot.access_mode === 'view_only') {
    return 'Tenant subscription is view-only';
  }
  if (snapshot.is_read_only || snapshot.access_mode === 'read_only') {
    return 'Tenant subscription is read-only';
  }
  if (snapshot.access_mode && snapshot.access_mode !== 'full') {
    return `Tenant subscription access_mode is ${snapshot.access_mode}`;
  }
  return false;
}

export async function fetchSubscriptionAccess(page: Page): Promise<SubscriptionAccessSnapshot> {
  const response = await page.request.get('/api/tenant/subscription-access');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);

  return body.data as SubscriptionAccessSnapshot;
}

export async function expectSubscriptionReadOnlyContract(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.code).toBe('SUBSCRIPTION_READ_ONLY');
  expect(body.reason).toBe('subscription_blocked');
  expect(body.subscription_status).toBe('EXPIRED');
  expect(body.access_mode).toBe('read_only');
}

export async function expectSubscriptionViewOnlyContract(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.code).toBe('SUBSCRIPTION_VIEW_ONLY');
  expect(body.reason).toBe('subscription_blocked');
  expect(body.access_mode).toBe('view_only');
}

export async function expectSubscriptionLockedContract(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.code).toBe('SUBSCRIPTION_LOCKED');
  expect(body.reason).toBe('subscription_blocked');
  expect(body.access_mode).toBe('locked');
}
