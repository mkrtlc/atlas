import { test, expect } from '@playwright/test';

// E2E tests run against a fresh database.
// The setup wizard must complete before login works.

const ADMIN = {
  name: 'E2E Admin',
  email: 'e2e@atlas.local',
  password: 'E2ePassword123!',
  company: 'E2E Test Corp',
};

test.describe('Setup wizard', () => {
  test('redirects to /setup on fresh database', async ({ page }) => {
    await page.goto('/');
    // Should redirect to setup or login
    await expect(page).toHaveURL(/\/(setup|login)/);
  });

  test('completes the 4-step setup wizard', async ({ page }) => {
    await page.goto('/setup');

    // Step 1: Language — click English card then Next
    await page.getByText('English').click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 2: Organization name
    await page.getByPlaceholder(/acme/i).fill(ADMIN.company);
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 3: Admin account
    await page.getByPlaceholder(/john doe/i).fill(ADMIN.name);
    await page.getByPlaceholder(/admin@company/i).fill(ADMIN.email);
    await page.getByPlaceholder(/minimum 8/i).fill(ADMIN.password);
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 4: Preferences — just click finish/complete
    await page.getByRole('button', { name: /finish|complete|start|done/i }).click();

    // Should redirect to home dashboard after setup
    await page.waitForURL('/', { timeout: 15_000 });
    await expect(page).toHaveURL('/');
  });
});

test.describe('Login', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Sign in to Atlas')).toBeVisible();
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill(ADMIN.email);
    await page.getByPlaceholder('Enter your password').fill(ADMIN.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to home
    await page.waitForURL('/', { timeout: 10_000 });
    await expect(page).toHaveURL('/');
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill(ADMIN.email);
    await page.getByPlaceholder('Enter your password').fill('WrongPass123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5_000 });
  });
});
