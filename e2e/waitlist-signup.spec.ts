import { test, expect } from '@playwright/test';

test('waitlist signup flow: land → enter email → submit → success', async ({ page }) => {
  await page.goto('/');

  // Scroll to the waitlist section (it's below the fold)
  const emailInput = page.locator('input[type="email"][placeholder="you@example.com"]');
  await emailInput.scrollIntoViewIfNeeded();
  await expect(emailInput).toBeVisible();

  // Enter a test email
  const testEmail = `playwright-test-${Date.now()}@example.com`;
  await emailInput.fill(testEmail);

  // Submit using the "Join Waitlist" button inside the form
  const submitButton = page.locator('button[type="submit"]', { hasText: 'Join Waitlist' });
  await submitButton.click();

  // Wait for success state
  await expect(page.locator('text=/You\'re #/i')).toBeVisible({ timeout: 10000 });
});
