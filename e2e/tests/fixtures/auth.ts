import { test as base } from '@playwright/test';

/**
 * Authentication Fixtures
 * Provides authenticated test context
 */

export interface AuthFixtures {
  authenticatedPage: any;
  trainerUser: {
    id: string;
    email: string;
    password: string;
  };
  traineeUser: {
    id: string;
    email: string;
    password: string;
  };
}

export const test = base.extend<AuthFixtures>({
  trainerUser: async ({}, use) => {
    const user = {
      id: 'test-trainer-id',
      email: 'trainer@test.com',
      password: 'test-password-123',
    };
    await use(user);
  },

  traineeUser: async ({}, use) => {
    const user = {
      id: 'test-trainee-id',
      email: 'trainee@test.com',
      password: 'test-password-123',
    };
    await use(user);
  },

  authenticatedPage: async ({ page, trainerUser }, use) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', trainerUser.email);
    await page.fill('input[type="password"]', trainerUser.password);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL('**/trainer/**', { timeout: 10000 });

    // Wait for authentication to complete
    await page.waitForLoadState('networkidle');

    await use(page);
  },
});

export { expect } from '@playwright/test';
