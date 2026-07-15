import { test, expect } from '@playwright/test';

test('OS-2673: hamburger at 768px, nav at 1280px', async ({ page }) => {
  // Tablet: hamburger visible, nav hidden
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('https://8os.ai', { waitUntil: 'networkidle' });
  
  const hamburger = page.locator('.header-hamburger');
  const navLinks = page.locator('.header-nav-links');
  const ctaDesktop = page.locator('.header-cta-desktop');
  
  await expect(hamburger).toBeVisible();
  await expect(navLinks).toBeHidden();
  await expect(ctaDesktop).toBeHidden();
  
  // Desktop: hamburger hidden, nav visible
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('https://8os.ai', { waitUntil: 'networkidle' });
  
  await expect(hamburger).toBeHidden();
  await expect(navLinks).toBeVisible();
  await expect(ctaDesktop).toBeVisible();
});
