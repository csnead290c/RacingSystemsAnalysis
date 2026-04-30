import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { 
  navigateToTechMaster, 
  navigateToTab, 
  selectFirstEvent,
  openFirstEntryDossier,
  waitForDataLoad 
} from '../helpers/tech-master';
import {
  placeHold,
  clearHold,
  verifyHoldBadgeInList,
  verifyNoHoldBadgeInList,
  verifyHoldInDossierHeader,
  verifyHoldInHistory,
  applyHoldFilter,
  countVisibleEntries,
} from '../helpers/holds';

/**
 * Batch 12: Hold/Escalation UI E2E Tests
 * 
 * Validates all hold placement, clearance, badge display, and filtering workflows
 */

test.describe('Batch 12: Hold/Escalation Workflows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('Complete hold workflow: place, verify, filter, clear', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Navigate to Tech Master and verify entries load
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Navigate to Tech Master', async () => {
      await navigateToTechMaster(page);
      await expect(page.locator('text=Tech Master')).toBeVisible();
    });

    await test.step('Navigate to Event Entries tab', async () => {
      await navigateToTab(page, 'Event Entries');
      await waitForDataLoad(page);
    });

    await test.step('Select first available event', async () => {
      const eventName = await selectFirstEvent(page);
      expect(eventName).toBeTruthy();
      await waitForDataLoad(page);
    });

    await test.step('Verify entries load in table', async () => {
      const rows = page.locator('table tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Open entry dossier and place compliance hold
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Navigate to Entry Dossier', async () => {
      await navigateToTab(page, 'Entry Dossier');
      await waitForDataLoad(page);
    });

    await test.step('Open first entry dossier', async () => {
      await openFirstEntryDossier(page);
      await expect(page.locator('text=Generated:')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Place compliance hold', async () => {
      await placeHold(
        page,
        'compliance_hold',
        'Test compliance hold for E2E validation',
        'Automated test - will be cleared'
      );
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Verify hold appears in dossier
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Verify hold badge in dossier header', async () => {
      await verifyHoldInDossierHeader(page, 'Compliance Hold');
    });

    await test.step('Verify hold in history section', async () => {
      await verifyHoldInHistory(page, 'Compliance Hold', 'ACTIVE');
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Verify hold badge appears in entry list
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Return to Event Entries', async () => {
      await navigateToTab(page, 'Event Entries');
      await waitForDataLoad(page);
      
      // Re-select event
      await selectFirstEvent(page);
      await waitForDataLoad(page);
    });

    await test.step('Verify hold badge in entry list', async () => {
      await verifyHoldBadgeInList(page, 'COMP');
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Verify hold indicator in compliance dashboard
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Navigate to Compliance Dashboard', async () => {
      await navigateToTab(page, 'Compliance');
      await waitForDataLoad(page);
    });

    await test.step('Select event in compliance dashboard', async () => {
      await selectFirstEvent(page);
      await waitForDataLoad(page);
    });

    await test.step('Verify hold badge in compliance table', async () => {
      // Look for COMP badge in the compliance table
      const compBadge = page.locator('table').locator('span:has-text("COMP")').first();
      await expect(compBadge).toBeVisible({ timeout: 5000 });
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Test hold filtering in entry list
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Return to Event Entries for filtering', async () => {
      await navigateToTab(page, 'Event Entries');
      await waitForDataLoad(page);
      await selectFirstEvent(page);
      await waitForDataLoad(page);
    });

    let totalEntries = 0;
    await test.step('Count total entries', async () => {
      totalEntries = await countVisibleEntries(page);
      expect(totalEntries).toBeGreaterThan(0);
    });

    await test.step('Filter to "With active holds"', async () => {
      await applyHoldFilter(page, 'with_holds');
      const heldEntries = await countVisibleEntries(page);
      expect(heldEntries).toBeGreaterThan(0);
      expect(heldEntries).toBeLessThanOrEqual(totalEntries);
    });

    await test.step('Filter to "No holds"', async () => {
      await applyHoldFilter(page, 'no_holds');
      // The entry with hold should not be visible
      const unheldEntries = await countVisibleEntries(page);
      expect(unheldEntries).toBeLessThan(totalEntries);
    });

    await test.step('Filter back to "All entries"', async () => {
      await applyHoldFilter(page, 'all');
      const allEntries = await countVisibleEntries(page);
      expect(allEntries).toBe(totalEntries);
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 7: Clear the hold
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Return to Entry Dossier to clear hold', async () => {
      await navigateToTab(page, 'Entry Dossier');
      await waitForDataLoad(page);
      await openFirstEntryDossier(page);
    });

    await test.step('Clear the hold', async () => {
      await clearHold(page, 'E2E test completed - clearing hold');
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 8: Verify hold status updates everywhere
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Verify hold shows as cleared in dossier', async () => {
      await verifyHoldInHistory(page, 'Compliance Hold', 'Cleared');
    });

    await test.step('Verify hold badge removed from entry list', async () => {
      await navigateToTab(page, 'Event Entries');
      await waitForDataLoad(page);
      await selectFirstEvent(page);
      await waitForDataLoad(page);
      
      // First entry should not have hold badge anymore
      await verifyNoHoldBadgeInList(page);
    });

    await test.step('Verify hold badge removed from compliance dashboard', async () => {
      await navigateToTab(page, 'Compliance');
      await waitForDataLoad(page);
      await selectFirstEvent(page);
      await waitForDataLoad(page);
      
      // Check that first entry row doesn't have COMP badge
      const firstRow = page.locator('table tbody tr').first();
      const compBadge = firstRow.locator('span:has-text("COMP")');
      await expect(compBadge).toHaveCount(0);
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 9: Test additional hold type (tech_hold)
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Place tech hold', async () => {
      await navigateToTab(page, 'Entry Dossier');
      await waitForDataLoad(page);
      await openFirstEntryDossier(page);
      
      await placeHold(
        page,
        'tech_hold',
        'Test tech hold for E2E validation',
        'Testing different hold type'
      );
    });

    await test.step('Verify tech hold badge appears', async () => {
      await navigateToTab(page, 'Event Entries');
      await waitForDataLoad(page);
      await selectFirstEvent(page);
      await waitForDataLoad(page);
      
      await verifyHoldBadgeInList(page, 'TECH');
    });

    await test.step('Clear tech hold', async () => {
      await navigateToTab(page, 'Entry Dossier');
      await waitForDataLoad(page);
      await openFirstEntryDossier(page);
      await clearHold(page, 'Cleanup after tech hold test');
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 10: Regression checks
    // ═══════════════════════════════════════════════════════════════════
    await test.step('Verify entry list still loads', async () => {
      await navigateToTab(page, 'Event Entries');
      await waitForDataLoad(page);
      await selectFirstEvent(page);
      const rows = page.locator('table tbody tr');
      await expect(rows.first()).toBeVisible();
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Verify dossier still loads', async () => {
      await navigateToTab(page, 'Entry Dossier');
      await waitForDataLoad(page);
      await openFirstEntryDossier(page);
      await expect(page.locator('text=Generated:')).toBeVisible();
    });

    await test.step('Verify compliance dashboard still loads', async () => {
      await navigateToTab(page, 'Compliance');
      await waitForDataLoad(page);
      await selectFirstEvent(page);
      const rows = page.locator('table tbody tr');
      await expect(rows.first()).toBeVisible();
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Verify no console errors', async () => {
      // Filter out known non-critical errors
      const criticalErrors = consoleErrors.filter(err => 
        !err.includes('favicon') && 
        !err.includes('manifest') &&
        !err.includes('service worker')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });
  });
});
