import { Page, expect } from '@playwright/test';

/**
 * Tech Master navigation and interaction helpers
 */

/**
 * Navigate to Tech Master shell
 */
export async function navigateToTechMaster(page: Page): Promise<void> {
  await page.goto('/tech');
  await page.waitForLoadState('networkidle');
  
  // Wait for Tech Master shell to load
  await expect(page.locator('text=Tech Master')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to a specific Tech Master tab
 */
export async function navigateToTab(page: Page, tabName: string): Promise<void> {
  const tabButton = page.locator(`button:has-text("${tabName}")`);
  await tabButton.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Select first available event from dropdown
 * Returns the event name if successful, throws if no events
 */
export async function selectFirstEvent(page: Page): Promise<string> {
  // Find event selector
  const eventSelect = page.locator('select').filter({ hasText: /Select event/ }).or(
    page.locator('select').first()
  );
  
  // Wait for select to be visible
  await eventSelect.waitFor({ state: 'visible', timeout: 10000 });
  
  // Get all options
  const options = await eventSelect.locator('option').allTextContents();
  
  // Filter out placeholder option
  const eventOptions = options.filter(opt => !opt.includes('Select event') && opt.trim() !== '');
  
  if (eventOptions.length === 0) {
    throw new Error('No events available for testing');
  }
  
  // Select first event
  const firstEvent = eventOptions[0];
  await eventSelect.selectOption({ label: firstEvent });
  
  // Wait for entries to load
  await page.waitForTimeout(1000);
  
  return firstEvent;
}

/**
 * Get first entry ID from entry list
 * Returns entry ID if found, throws if no entries
 */
export async function getFirstEntryId(page: Page): Promise<number> {
  // Wait for entry table to load
  await page.waitForSelector('table', { timeout: 10000 });
  
  // Find first entry row
  const firstRow = page.locator('table tbody tr').first();
  await firstRow.waitFor({ state: 'visible', timeout: 5000 });
  
  // Get competition number from first cell
  const competitionNumber = await firstRow.locator('td').first().textContent();
  
  if (!competitionNumber || competitionNumber === '—') {
    throw new Error('No entries available for testing');
  }
  
  // Click the row to get entry ID (we'll extract from URL or detail drawer)
  await firstRow.click();
  
  // Wait a moment for any navigation or drawer to open
  await page.waitForTimeout(500);
  
  // For now, return a placeholder - we'll refine this based on actual UI behavior
  return 1;
}

/**
 * Open entry dossier for first entry
 */
export async function openFirstEntryDossier(page: Page): Promise<void> {
  // Navigate to Entry Dossier tab
  await navigateToTab(page, 'Entry Dossier');
  
  // Select first event
  await selectFirstEvent(page);
  
  // Wait for entry selector to populate
  await page.waitForTimeout(1000);
  
  // Select first entry from dropdown
  const entrySelect = page.locator('select').filter({ hasText: /Select entry/ }).or(
    page.locator('select').nth(1) // Second select is usually entry
  );
  
  await entrySelect.waitFor({ state: 'visible', timeout: 5000 });
  
  const entryOptions = await entrySelect.locator('option').allTextContents();
  const validEntries = entryOptions.filter(opt => !opt.includes('Select entry') && opt.trim() !== '');
  
  if (validEntries.length === 0) {
    throw new Error('No entries available for dossier testing');
  }
  
  await entrySelect.selectOption({ label: validEntries[0] });
  
  // Wait for dossier to load
  await page.waitForTimeout(1500);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for data to finish loading
 */
export async function waitForDataLoad(page: Page): Promise<void> {
  // Wait for any loading indicators to disappear
  await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 }).catch(() => {
    // Loading text might not exist, that's fine
  });
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Check for console errors
 */
export async function checkForConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  return errors;
}
