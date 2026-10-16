import { expect, test } from '@playwright/test';

import {
  createLockedTenantAdminContext,
  createViewOnlyTenantAdminContext,
  skipWithoutLockedTenantAdmin,
  skipWithoutViewOnlyTenantAdmin,
} from '../helpers/auth-context';
import {
  expectSubscriptionLockedContract,
  expectSubscriptionViewOnlyContract,
  fetchSubscriptionAccess,
} from '../helpers/subscription-api';
import { VIEW_ONLY_BCC_ID, VIEW_ONLY_FAMILY_NAME } from '../helpers/subscription-expired';

/**
 * Requires staging (or local) with TENANT_SUBSCRIPTION_VIEW_ONLY_LOCKED_ENFORCEMENT=true
 * and dedicated parish fixtures + Playwright storage states.
 */
test.describe.serial('View-only enforcement (expired past grace)', () => {
  test('access snapshot is view_only', async ({ browser }) => {
    test.skip(skipWithoutViewOnlyTenantAdmin(), skipWithoutViewOnlyTenantAdmin() || undefined);

    const context = await createViewOnlyTenantAdminContext(browser);
    const page = await context.newPage();

    const snapshot = await fetchSubscriptionAccess(page);
    expect(snapshot.access_mode).toBe('view_only');
    expect(snapshot.view_only_locked_enforcement).toBe(true);

    await context.close();
  });

  test('can browse families but API mutation returns SUBSCRIPTION_VIEW_ONLY', async ({ browser }) => {
    test.skip(skipWithoutViewOnlyTenantAdmin(), skipWithoutViewOnlyTenantAdmin() || undefined);

    const context = await createViewOnlyTenantAdminContext(browser);
    const page = await context.newPage();

    await page.goto('/families');
    await expect(page).toHaveURL(/\/families/);
    await expect(page.getByText(VIEW_ONLY_FAMILY_NAME)).toBeVisible();

    const createResponse = await page.request.post('/api/families', {
      data: {
        family_name: 'E2E View-Only Blocked',
        head_of_family: 'Blocked',
        bcc_id: VIEW_ONLY_BCC_ID,
        status: 'active',
      },
    });
    await expectSubscriptionViewOnlyContract(createResponse);

    await context.close();
  });

  test('Add Family stays visible and opens restriction modal', async ({ browser }) => {
    test.skip(skipWithoutViewOnlyTenantAdmin(), skipWithoutViewOnlyTenantAdmin() || undefined);

    const context = await createViewOnlyTenantAdminContext(browser);
    const page = await context.newPage();

    await page.goto('/families');
    const addFamily = page.getByRole('button', { name: 'Add Family' }).first();
    await expect(addFamily).toBeEnabled();
    await addFamily.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Subscription Expired — View-Only Mode')).toBeVisible();

    await context.close();
  });
});

test.describe.serial('Locked enforcement (past view-only window)', () => {
  test('access snapshot is locked', async ({ browser }) => {
    test.skip(skipWithoutLockedTenantAdmin(), skipWithoutLockedTenantAdmin() || undefined);

    const context = await createLockedTenantAdminContext(browser);
    const page = await context.newPage();

    const snapshot = await fetchSubscriptionAccess(page);
    expect(snapshot.access_mode).toBe('locked');

    await context.close();
  });

  test('parish routes redirect to subscription locked page', async ({ browser }) => {
    test.skip(skipWithoutLockedTenantAdmin(), skipWithoutLockedTenantAdmin() || undefined);

    const context = await createLockedTenantAdminContext(browser);
    const page = await context.newPage();

    await page.goto('/families');
    await expect(page).toHaveURL(/\/subscription-locked/);

    await context.close();
  });

  test('families API returns SUBSCRIPTION_LOCKED', async ({ browser }) => {
    test.skip(skipWithoutLockedTenantAdmin(), skipWithoutLockedTenantAdmin() || undefined);

    const context = await createLockedTenantAdminContext(browser);
    const page = await context.newPage();

    const listResponse = await page.request.get('/api/families');
    await expectSubscriptionLockedContract(listResponse);

    await context.close();
  });
});
