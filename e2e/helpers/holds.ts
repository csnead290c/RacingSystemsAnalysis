import { Page, expect } from '@playwright/test';

/**
 * Hold/Escalation workflow helpers for Batch 12 validation
 */

export type HoldType = 'compliance_hold' | 'tech_hold' | 'escalation' | 'flag';

/**
 * Place a hold on the currently open entry dossier
 */
export async function placeHold(
  page: Page,
  holdType: HoldType,
  reason: string,
  notes?: string
): Promise<void> {
  // Click "Place Hold" button
  const placeHoldButton = page.locator('button:has-text("Place Hold")');
  await expect(placeHoldButton).toBeVisible({ timeout: 5000 });
  await placeHoldButton.click();
  
  // Wait for modal to open
  await expect(page.locator('text=Place Hold on Entry')).toBeVisible({ timeout: 5000 });
  
  // Select hold type
  const holdTypeSelect = page.locator('select').first();
  await holdTypeSelect.selectOption(holdType);
  
  // Enter reason
  const reasonTextarea = page.locator('textarea').filter({ hasText: /reason/i }).or(
    page.locator('textarea').first()
  );
  await reasonTextarea.fill(reason);
  
  // Enter notes if provided
  if (notes) {
    const notesTextarea = page.locator('textarea').filter({ hasText: /notes/i }).or(
      page.locator('textarea').nth(1)
    );
    await notesTextarea.fill(notes);
  }
  
  // Submit
  const submitButton = page.locator('button:has-text("Place Hold")').last();
  await submitButton.click();
  
  // Wait for modal to close
  await expect(page.locator('text=Place Hold on Entry')).toBeHidden({ timeout: 5000 });
  
  // Wait for data to reload
  await page.waitForTimeout(1000);
}

/**
 * Clear a hold from the currently open entry dossier
 */
export async function clearHold(page: Page, notes?: string): Promise<void> {
  // Find and click "Clear Hold" button (should be on an active hold)
  const clearHoldButton = page.locator('button:has-text("Clear Hold")').first();
  await expect(clearHoldButton).toBeVisible({ timeout: 5000 });
  await clearHoldButton.click();
  
  // Wait for modal to open
  await expect(page.locator('text=Clear Hold')).toBeVisible({ timeout: 5000 });
  
  // Enter clearance notes if provided
  if (notes) {
    const notesTextarea = page.locator('textarea');
    await notesTextarea.fill(notes);
  }
  
  // Submit
  const submitButton = page.locator('button:has-text("Clear Hold")').last();
  await submitButton.click();
  
  // Wait for modal to close
  await expect(page.locator('text=Clear Hold')).toBeHidden({ timeout: 5000 });
  
  // Wait for data to reload
  await page.waitForTimeout(1000);
}

/**
 * Verify hold badge exists in entry list
 */
export async function verifyHoldBadgeInList(
  page: Page,
  expectedType: 'COMP' | 'TECH' | 'ESC' | 'FLAG'
): Promise<void> {
  // Look for badge with expected abbreviation
  const badge = page.locator(`span:has-text("${expectedType}")`).first();
  await expect(badge).toBeVisible({ timeout: 5000 });
}

/**
 * Verify hold badge does NOT exist in entry list
 */
export async function verifyNoHoldBadgeInList(page: Page): Promise<void> {
  // Check that no hold badges are visible in the first entry row
  const badges = page.locator('table tbody tr').first().locator('span:has-text("COMP"), span:has-text("TECH"), span:has-text("ESC"), span:has-text("FLAG")');
  await expect(badges).toHaveCount(0, { timeout: 5000 });
}

/**
 * Verify hold appears in dossier header
 */
export async function verifyHoldInDossierHeader(
  page: Page,
  expectedLabel: string
): Promise<void> {
  const holdBadge = page.locator(`span:has-text("${expectedLabel}")`).first();
  await expect(holdBadge).toBeVisible({ timeout: 5000 });
}

/**
 * Verify hold appears in dossier history section
 */
export async function verifyHoldInHistory(
  page: Page,
  expectedType: string,
  expectedStatus: 'ACTIVE' | 'Cleared'
): Promise<void> {
  // Look for hold history section
  await expect(page.locator('text=Hold History')).toBeVisible({ timeout: 5000 });
  
  // Verify hold type badge
  const typeBadge = page.locator(`span:has-text("${expectedType}")`).first();
  await expect(typeBadge).toBeVisible();
  
  // Verify status
  const statusText = page.locator(`text=${expectedStatus}`).first();
  await expect(statusText).toBeVisible();
}

/**
 * Apply hold filter in entry list
 */
export async function applyHoldFilter(
  page: Page,
  filterValue: 'all' | 'with_holds' | 'no_holds'
): Promise<void> {
  // Find the Holds filter dropdown
  const holdsLabel = page.locator('label:has-text("Holds")');
  await expect(holdsLabel).toBeVisible({ timeout: 5000 });
  
  // Find the select next to the Holds label
  const holdsSelect = page.locator('select').filter({ hasText: /All entries|With active holds|No holds/ });
  await holdsSelect.waitFor({ state: 'visible', timeout: 5000 });
  
  // Select the appropriate option
  const optionMap = {
    all: 'All entries',
    with_holds: 'With active holds',
    no_holds: 'No holds',
  };
  
  await holdsSelect.selectOption({ label: optionMap[filterValue] });
  
  // Wait for filter to apply
  await page.waitForTimeout(500);
}

/**
 * Count visible entries in the entry list
 */
export async function countVisibleEntries(page: Page): Promise<number> {
  const rows = page.locator('table tbody tr');
  return await rows.count();
}
