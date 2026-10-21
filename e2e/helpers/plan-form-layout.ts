import { expect, Locator } from '@playwright/test';

const TRAILING_EDGE_TOLERANCE_PX = 4;

/** Asserts a flex action row aligns its controls to the trailing edge (save/cancel footer). */
export async function expectRightAlignedFormActions(actions: Locator): Promise<void> {
  await expect(actions).toBeVisible();
  await expect(actions).toHaveCSS('justify-content', 'flex-end');

  const rowBox = await actions.boundingBox();
  const lastButton = actions.locator('button').last();
  await expect(lastButton).toBeVisible();
  const buttonBox = await lastButton.boundingBox();

  expect(rowBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();

  const rowRight = rowBox!.x + rowBox!.width;
  const buttonRight = buttonBox!.x + buttonBox!.width;
  expect(Math.abs(rowRight - buttonRight)).toBeLessThanOrEqual(TRAILING_EDGE_TOLERANCE_PX);
}
