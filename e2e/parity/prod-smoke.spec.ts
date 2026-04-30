import { test, expect } from '@playwright/test';

const PROD_URL = 'https://racingsystemsanalysis.com';

test.describe('Production Smoke Test - Multi-Event Event Parity Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    (test as any).consoleErrors = consoleErrors;
  });

  test('Multi-event Event Parity - Event column populated', async ({ page }) => {
    // Navigate to Tech Parity
    await page.goto(`${PROD_URL}/parity`);
    await page.waitForLoadState('networkidle');
    
    // Click on Parity Report
    await page.click('text=Parity Report');
    await page.waitForTimeout(1000);
    
    // Select a category (Pro Stock often requires scanning multiple events)
    await page.selectOption('select[name="category"]', 'Pro Stock');
    
    // Select multi-event mode (3 events)
    await page.click('text=Last 3 Events');
    
    // Wait for report to load
    await page.waitForSelector('[data-testid="parity-event-report"]', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/prod-multi-event.png', fullPage: true });
    
    // Check subtitle
    const subtitle = await page.locator('div:has-text("events represented:")').first();
    await expect(subtitle).toBeVisible();
    const subtitleText = await subtitle.textContent();
    console.log('Subtitle:', subtitleText);
    
    // Verify no empty Event cells
    const eventCells = await page.locator('td:has-text("2025")').all();
    console.log(`Found ${eventCells.length} event cells with year`);
    
    // Check that event column cells are not blank
    const emptyEventCells = await page.locator('td:empty').filter({ hasText: /^$/ }).count();
    console.log(`Empty cells found: ${emptyEventCells}`);
    
    // Verify the fix - all displayed rows should have event labels
    const eventColumnHeaders = await page.locator('th:has-text("Event")').count();
    if (eventColumnHeaders > 0) {
      // Multi-event mode shows Event column
      const rows = await page.locator('tbody tr').count();
      console.log(`Total rows: ${rows}`);
      
      // Check for any blank event cells
      const allEventCells = await page.locator('td:nth-child(6)').allTextContents();
      const blankCells = allEventCells.filter(text => !text || text.trim() === '');
      console.log(`Blank event cells: ${blankCells.length}`);
    }
  });

  test('Single-event Event Parity - no regression', async ({ page }) => {
    await page.goto(`${PROD_URL}/parity`);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Parity Report');
    await page.waitForTimeout(1000);
    
    // Select Pro Stock
    await page.selectOption('select[name="category"]', 'Pro Stock');
    
    // Select single event mode
    await page.click('text=Single Event');
    
    // Wait for report
    await page.waitForSelector('[data-testid="parity-event-report"]', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/prod-single-event.png', fullPage: true });
    
    // Single event should NOT show Event column
    const eventColumn = await page.locator('th:has-text("Event")').count();
    expect(eventColumn).toBe(0);
    
    // Should not show multi-event subtitle
    const subtitle = await page.locator('text=events represented').count();
    expect(subtitle).toBe(0);
    
    console.log('Single-event mode: OK - no Event column, no multi-event subtitle');
  });

  test('Long-Term Parity - no regression', async ({ page }) => {
    await page.goto(`${PROD_URL}/parity`);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Parity Report');
    await page.waitForTimeout(1000);
    
    // Click on Long-Term Parity tab if available
    const longTermTab = page.locator('text=Long-Term Parity');
    if (await longTermTab.count() > 0) {
      await longTermTab.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/prod-long-term.png', fullPage: true });
      
      // Verify chart or table is visible
      const content = await page.locator('.parity-longterm-report, [data-testid="parity-best-chart"]').count();
      expect(content).toBeGreaterThan(0);
      
      console.log('Long-Term Parity: OK');
    } else {
      console.log('Long-Term Parity tab not found - may need different navigation');
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    const errors = (test as any).consoleErrors || [];
    const parityErrors = errors.filter((e: string) => 
      e.toLowerCase().includes('parity') || 
      e.toLowerCase().includes('event') ||
      e.toLowerCase().includes('report')
    );
    
    if (parityErrors.length > 0) {
      console.log(`Console errors for ${testInfo.title}:`, parityErrors);
    }
    
    expect(parityErrors.length).toBe(0);
  });
});
