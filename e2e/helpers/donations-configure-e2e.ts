import { Browser, expect, Locator, Page, test } from '@playwright/test';

import { createTenantAdminContext, skipWithoutTenantAdmin } from './auth-context';
import { fetchSubscriptionAccess, skipUnlessActiveSubscriptionAccess } from './subscription-api';

export interface DonationsConfigureE2eSession {
  context: Awaited<ReturnType<typeof createTenantAdminContext>>;
  page: Page;
  formCard: Locator;
}

/** Skips the test when RBAC storage or parish subscription cannot run configure flows. */
export async function beginDonationsConfigureSession(browser: Browser): Promise<DonationsConfigureE2eSession> {
  const adminSkip = skipWithoutTenantAdmin();
  test.skip(adminSkip, adminSkip || undefined);

  const context = await createTenantAdminContext(browser);
  const page = await context.newPage();

  const subscription = await fetchSubscriptionAccess(page);
  const subscriptionSkip = skipUnlessActiveSubscriptionAccess(subscription);
  test.skip(subscriptionSkip, subscriptionSkip || undefined);

  const formCard = await openContributionPlansPage(page);
  return { context, page, formCard };
}

export async function openContributionPlansPage(page: Page): Promise<Locator> {
  await page.goto('/donations/plans');
  await expect(page).toHaveURL(/\/donations\/plans/);
  await expect(page.getByRole('heading', { name: 'Contribution Plans', level: 1 })).toBeVisible();
  await expect(page.locator('.plan-loading')).toHaveCount(0);

  const formCard = page.locator('#plan-form-card');
  await expect(formCard).toBeVisible();
  return formCard;
}
