import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * OS-905 — Product Hunt gallery screenshots.
 *
 * Captures the 5 screenshots required by the PH submission:
 *   1. Hero / Landing       — main headline + counter + CTA
 *   2. As Seen On           — press logos (Product Hunt, HN, IH, TechCrunch)
 *   3. Archetypes           — the 4 archetype types with visuals (public page)
 *   4. Testimonials         — user testimonials carousel
 *   5. Waitlist             — waitlist signup form / booking widget
 *
 * PH spec: PNG/JPG, min 1270x760, max 10MB each.
 * Captures at 1440x900 viewport @ 2x DPR → 2880x1800 PNG.
 *
 * Run with: pnpm exec playwright test e2e/os-905-ph-gallery.spec.ts
 */

const OUT_DIR = path.resolve(__dirname, 'screenshots', 'os-905');

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

const COMMON_USE = {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // 2x for crispness on PH
  fullPage: false,
};

async function settleHero(page: import('@playwright/test').Page): Promise<void> {
  // Wait for headline + counter to be visible (settle any client hydration)
  await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(800);
}

test.describe('OS-905 PH gallery capture', () => {
  test.use(COMMON_USE);

  test('1. Hero — headline + 247 OS generated today counter + CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await settleHero(page);

    await page.screenshot({
      path: path.join(OUT_DIR, '01-hero-landing.png'),
      fullPage: false,
      type: 'png',
    });
  });

  test('2. As Seen On — TechCrunch, Product Hunt, Indie Hackers, Hacker News logos', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await settleHero(page);

    // "As Seen On" sits between hero stats and "How It Works" section
    const target = page.locator('text=/As Seen On/i').first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(OUT_DIR, '02-as-seen-on.png'),
      fullPage: false,
      type: 'png',
    });
  });

  test('3. Archetypes — Strategic Commander, Nurturing Creative, Harmonizer Guardian, Steady Achiever', async ({ page }) => {
    await page.goto('/archetypes', { waitUntil: 'networkidle', timeout: 30000 });
    await settleHero(page);
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(OUT_DIR, '03-archetypes.png'),
      fullPage: false,
      type: 'png',
    });
  });

  test('4. Testimonials — "What People Are Saying" carousel', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await settleHero(page);

    const target = page.locator('h2', { hasText: /What People Are Saying/i });
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(OUT_DIR, '04-testimonials.png'),
      fullPage: false,
      type: 'png',
    });
  });

  test('5. Waitlist signup + Upcoming Bookings — conversion surface', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await settleHero(page);

    const target = page.locator('#waitlist');
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(OUT_DIR, '05-waitlist-signup.png'),
      fullPage: false,
      type: 'png',
    });
  });
});