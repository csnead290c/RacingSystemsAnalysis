import { Page } from '@playwright/test';

/**
 * Authentication helper for E2E tests
 * Uses localStorage injection to bypass login form
 */

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  status: string;
}

export const TEST_USERS = {
  ADMIN: {
    id: 'admin_001',
    email: 'admin@rsa.local',
    displayName: 'Administrator',
    roleId: 'admin',
    status: 'active',
  },
  OWNER: {
    id: 'owner_001',
    email: 'owner@rsa.local',
    displayName: 'System Owner',
    roleId: 'owner',
    status: 'active',
  },
} as const;

/**
 * Login as admin user via the login form
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  
  // Fill in login form
  await page.fill('input[type="email"]', 'admin@rsa.local');
  await page.fill('input[type="password"]', 'password');
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to home page
  await page.waitForURL('/', { timeout: 10000 });
  
  // Wait for auth to be fully processed
  await page.waitForTimeout(1000);
}

/**
 * Login as owner user by injecting auth state into localStorage
 */
export async function loginAsOwner(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((user) => {
    localStorage.setItem('rsa.auth.currentUser', JSON.stringify(user));
  }, TEST_USERS.OWNER);
  await page.reload();
  
  // Wait for auth to be processed
  await page.waitForTimeout(500);
}

/**
 * Logout by clearing localStorage
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const user = localStorage.getItem('rsa.auth.currentUser');
    return user !== null;
  });
}
