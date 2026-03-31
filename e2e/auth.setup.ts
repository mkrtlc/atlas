/**
 * Shared auth helper — logs in and saves storage state for reuse across tests.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

const ADMIN = {
  email: 'e2e@atlas.local',
  password: 'E2ePassword123!',
};

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('you@company.com').fill(ADMIN.email);
  await page.getByPlaceholder('Enter your password').fill(ADMIN.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 10_000 });
  await expect(page).toHaveURL('/');

  // Save auth state (localStorage tokens)
  await page.context().storageState({ path: AUTH_FILE });
});

export { AUTH_FILE };
