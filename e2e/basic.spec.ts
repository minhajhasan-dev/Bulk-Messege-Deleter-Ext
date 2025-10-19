import { test, expect } from '@playwright/test';

// Minimal E2E scaffold: verifies dev server can serve preview page (not extension)
// In a real setup, tests would launch Chrome with the built extension loaded.

test('preview page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Side Panel/);
});
