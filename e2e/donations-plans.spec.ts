import { expect, test } from '@playwright/test';

import { beginDonationsConfigureSession } from './helpers/donations-configure-e2e';
import { expectRightAlignedFormActions } from './helpers/plan-form-layout';

test.describe('Contribution plans', () => {
  test('plans workspace loads after contribution plans API resolves', async ({ browser }) => {
    const { context, page, formCard } = await beginDonationsConfigureSession(browser);

    await expect(formCard.getByRole('heading', { name: 'New plan', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Plan list', level: 2 })).toBeVisible();

    await context.close();
  });

  test('new plan form footer actions are right-aligned', async ({ browser }) => {
    const { context, formCard } = await beginDonationsConfigureSession(browser);

    await formCard.getByRole('button', { name: 'New', exact: true }).click();
    await expect(formCard.getByRole('heading', { name: 'New plan', level: 2 })).toBeVisible();

    const actions = formCard.locator('.plan-actions');
    await expect(actions.getByRole('button', { name: 'Create plan' })).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expectRightAlignedFormActions(actions);

    await context.close();
  });

  test('edit plan form footer actions are right-aligned', async ({ browser }) => {
    const { context, page, formCard } = await beginDonationsConfigureSession(browser);

    const editButtons = page.getByRole('button', { name: /^Edit / });
    const editCount = await editButtons.count();
    test.skip(editCount === 0, 'No contribution plans available to edit in this tenant');

    await editButtons.first().click();

    await expect(formCard.getByRole('heading', { name: 'Edit plan', level: 2 })).toBeVisible();

    const actions = formCard.locator('.plan-actions');
    await expect(actions.getByRole('button', { name: 'Save changes' })).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expectRightAlignedFormActions(actions);

    await context.close();
  });
});
