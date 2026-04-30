/**
 * RSA Auth E2E - Core Signup Flows (MINIMAL REPRO)
 * 
 * EXACTLY 2 TESTS:
 * 1. Standard signup → Free user
 * 2. NHRA invite signup → NHRA user
 * 
 * Run: npm run test:e2e:core
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Generate unique test email
function generateTestEmail(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}@test.rsa.local`;
}

// Get user from localStorage
async function getUserFromStorage(page: Page) {
  const userJson = await page.evaluate(() => {
    return localStorage.getItem('rsa.auth.currentUser');
  });
  return userJson ? JSON.parse(userJson) : null;
}

// Wait for post-login navigation
async function waitForPostLoginNavigation(page: Page) {
  await page.waitForURL(/\/(home|dashboard|parity|$)/, { timeout: 10000 });
}

test.describe('Core Signup Flows', () => {
  
  test('TEST 1: Standard signup creates Free user', async ({ page }) => {
    const email = generateTestEmail('free-user');
    const password = 'TestPassword123!';
    const name = 'Free Test User';

    // Minimal test identification
    console.log('TEST 1: Standard signup → Free user');

    // Navigate to registration
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    // Click "Start free" to skip tier selection
    await page.click('text=Start free');
    await page.waitForLoadState('networkidle');

    // Fill registration form
    await page.fill('input[placeholder="John Doe"]', name);
    await page.fill('input[placeholder="you@example.com"]', email);
    await page.fill('input[placeholder="At least 8 characters"]', password);
    await page.fill('input[placeholder="Confirm your password"]', password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect
    await waitForPostLoginNavigation(page);

    // Verify user data in localStorage
    const user = await getUserFromStorage(page);
    
    expect(user).toBeTruthy();
    expect(user.email).toBe(email);
    expect(user.displayName).toBe(name);
    expect(user.subscription_plan).toBe('free');
  });

  test('TEST 2: NHRA invite signup creates NHRA user', async ({ page }) => {
    const inviteCode = 'nhra_E2E_TEST_VALID_2026';
    const email = generateTestEmail('nhra-user');
    const password = 'TestPassword123!';
    const name = 'NHRA Test User';

    // Minimal test identification
    console.log('TEST 2: NHRA invite signup → NHRA user');

    // Navigate with invite code (skips tier selection)
    await page.goto(`${BASE_URL}/register?invite=${inviteCode}`);
    await page.waitForLoadState('networkidle');

    // Fill registration form
    await page.fill('input[placeholder="John Doe"]', name);
    await page.fill('input[placeholder="you@example.com"]', email);
    await page.fill('input[placeholder="At least 8 characters"]', password);
    await page.fill('input[placeholder="Confirm your password"]', password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect
    await waitForPostLoginNavigation(page);

    // Verify user data in localStorage
    const user = await getUserFromStorage(page);
    
    expect(user).toBeTruthy();
    expect(user.email).toBe(email);
    expect(user.displayName).toBe(name);
    expect(user.subscription_plan).toBe('nhra');
  });
});
