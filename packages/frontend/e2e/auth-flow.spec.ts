import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const API_URL = 'http://localhost:3000';

// Utilidad para limpiar usuarios de test
async function cleanupTestUser(email: string) {
  await fetch(`${API_URL}/test-utils/delete-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

test.describe('Auth Flow', () => {
  const testEmail = `e2euser_${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'E2E User';

  test.beforeAll(async () => {
    await cleanupTestUser(testEmail);
  });

  test('User can register and login', async ({ page }) => {
    // Registro
    await page.goto(`${BASE_URL}/signup`);
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page.locator('.signup-success')).toHaveText(/success/i);

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page.locator('.login-success')).toHaveText(/success/i);
  });

  test.afterAll(async () => {
    await cleanupTestUser(testEmail);
  });
});
