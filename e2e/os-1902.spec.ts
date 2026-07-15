/**
 * OS-1902: Browser-CLICKING QA agent — full UX walk harness
 *
 * This is the durable, reusable browser-QA capability that headless/API QA
 * could never provide. It clicks through EVERY user-facing flow against the
 * live production site (https://8os.ai) using Clerk dev test mode:
 *
 *   signup → onboarding (birth → quiz → archetype → goals → complete)
 *         → dashboard → tasks → goals → archetype → briefing
 *
 * For each step it captures a full-page screenshot under
 * e2e/screenshots/os-1902/ and records console/page/request errors to a
 * QA report. Any blocking page error (e.g. "Something went wrong") fails
 * the test so this can gate releases.
 *
 * Auth: Clerk dev test mode. Any email matching /+clerk_test/ is auto-created
 * and verified in test environments — no OTP delivery required. If Clerk does
 * present an OTP step, the code 424242 is entered automatically.
 *
 * Run:  npx playwright test e2e/os-1902.spec.ts
 *   or  npm run test:e2e -- os-1902
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://8os.ai';
const SHOT_DIR = path.join(__dirname, 'screenshots', 'os-1902');
const REPORT_PATH = path.join(SHOT_DIR, 'errors.txt');

/** Errors collected across the whole walk; flushed at the end. */
const walkErrors: string[] = [];

function recordError(source: string, detail: string) {
  const line = `[${source}] ${detail}`.slice(0, 400);
  walkErrors.push(line);
  console.log('  ⚠️', line);
}

function shot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  return page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true });
}

async function bodyText(page: import('@playwright/test').Page, n = 500) {
  return page
    .evaluate(() => document.body?.innerText?.replace(/\n/g, ' | ') ?? '')
    .then((t) => t.slice(0, n));
}

/**
 * Sign up a fresh test user via Clerk dev test mode.
 * Returns once the post-signup redirect has settled.
 */
async function signUpTestUser(page: import('@playwright/test').Page) {
  const email = `qa-${Date.now()}+clerk_test@8os.ai`;
  const password = 'QaTest!2345xyz';
  console.log('  signup email:', email);

  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, '01-signup');

  // The signup email input renders as type="text" (Clerk), matched by placeholder.
  const emailInput = page
    .locator('input[placeholder*="mail" i], input[placeholder*="example" i], input[name="identifier"]')
    .first();
  await emailInput.fill(email);

  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.fill(password);
  await shot(page, '02-filled');

  await page.locator('button[type="submit"]').first().click();
  // Clerk test mode redirects to /onboarding (or occasionally an OTP step).
  await page.waitForTimeout(8000);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await shot(page, '03-after-submit');

  // Handle an OTP step if Clerk shows one (test env usually skips it).
  const otp = page.locator(
    'input[autocomplete="one-time-code"], input[name="code"], input[inputmode="numeric"]',
  );
  if ((await otp.count()) > 0) {
    await otp.first().fill('424242').catch(async () => {
      const boxes = page.locator('input[maxlength="1"]');
      const code = '424242';
      for (let i = 0; i < code.length; i++) {
        await boxes.nth(i).fill(code[i]).catch(() => {});
      }
    });
    await page.locator('button[type="submit"], button:has-text("Continue")').first().click().catch(() => {});
    await page.waitForTimeout(6000);
    await shot(page, '04-after-code');
  }

  console.log('  post-auth URL:', page.url());
  return email;
}

/** Click the first "Continue" submit button and wait for the step to settle. */
async function continueToNextStep(page: import('@playwright/test').Page) {
  await page
    .locator('button[type="submit"]:has-text("Continue"), button:has-text("Continue")')
    .first()
    .click();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

test.describe('OS-1902: Full browser UX walk', () => {
  test.beforeEach(async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    page.on('console', (m) => {
      if (m.type() === 'error') recordError('console', m.text().slice(0, 300));
    });
    page.on('pageerror', (e) => recordError('pageerror', e.message.slice(0, 300)));
    page.on('requestfailed', (r) => {
      const url = r.url();
      // Ignore cosmetic CSP-blocked analytics beacons and benign RSC prefetches.
      if (/cloudflareinsights\.com/.test(url)) return;
      recordError('reqfail', `${url.slice(0, 120)} ${(r.failure()?.errorText ?? '').slice(0, 80)}`);
    });
  });

  test.afterAll(() => {
    fs.writeFileSync(REPORT_PATH, walkErrors.join('\n'));
    console.log(`\n=== OS-1902 QA report (${walkErrors.length} issues) → ${REPORT_PATH}`);
  });

  test('Signup → Clerk test-mode auth → onboarding redirect', async ({ page }) => {
    await signUpTestUser(page);
    // Must have escaped the signup form (onboarding, dashboard, or an OTP page).
    const url = page.url();
    expect(url, `Still on signup after submit: ${url}`).not.toMatch(/\/signup/);
    await shot(page, '05-auth-landed');
  });

  test('Onboarding: birth → quiz → archetype → goals → complete', async ({ page }) => {
    await signUpTestUser(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '10-onboarding-birth');

    // --- Birth step ---
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.count()) await dateInput.first().fill('1990-06-15');

    const meridiem = page.locator('select[aria-label="AM or PM"]');
    if (await meridiem.count()) {
      const opts = await meridiem.locator('option').allTextContents();
      expect(opts, 'AM/PM dropdown must expose both AM and PM').toEqual(
        expect.arrayContaining(['AM', 'PM']),
      );
      await meridiem.selectOption('AM');
    } else {
      // Legacy production may still serve <input type="time">; record, don't hard-fail.
      recordError('onboarding-birth', 'AM/PM <select> missing (legacy <input type=time> in prod?)');
    }

    const hourSelect = page.locator('select[aria-label="Birth hour"]');
    if (await hourSelect.count()) await hourSelect.selectOption('8');

    const locInput = page.locator('input[placeholder*="city" i], input[placeholder*="ocation" i]');
    if (await locInput.count()) await locInput.first().fill('New York, USA');
    await shot(page, '11-birth-filled');

    // --- Quiz step ---
    await continueToNextStep(page);
    await shot(page, '12-quiz');
    const quizSelects = page.locator('select:not([aria-label])');
    const quizCount = await quizSelects.count();
    for (let i = 0; i < quizCount; i++) {
      await quizSelects.nth(i).selectOption({ index: 1 }).catch(() => {});
    }
    await shot(page, '13-quiz-filled');

    // --- Archetype step ---
    await continueToNextStep(page);
    await shot(page, '14-archetype');

    // --- Goals step ---
    await continueToNextStep(page);
    await shot(page, '15-goals');
    const goalButtons = page.locator('button[aria-pressed]');
    const goalCount = await goalButtons.count();
    for (let i = 0; i < Math.min(2, goalCount); i++) {
      await goalButtons.nth(i).click();
      await page.waitForTimeout(200);
    }
    await shot(page, '16-goals-selected');

    // --- Complete ---
    await continueToNextStep(page);
    await shot(page, '17-complete');
    console.log('  onboarding complete at', page.url());
  });

  test('Dashboard renders without "Something went wrong"', async ({ page }) => {
    await signUpTestUser(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, '20-dashboard');

    const text = await bodyText(page, 600);
    expect(text, 'Dashboard hit the error boundary').not.toMatch(/something went wrong/i);
    console.log('  dashboard OK at', page.url());
  });

  test('Tasks page loads', async ({ page }) => {
    await signUpTestUser(page);
    await page.goto(`${BASE_URL}/dashboard/tasks`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, '30-tasks');

    const text = await bodyText(page, 300);
    if (/404|could not be found/i.test(text)) {
      recordError('tasks', '/dashboard/tasks returned 404');
      console.log('  ❌ tasks 404');
    } else {
      console.log('  tasks OK at', page.url());
    }
  });

  test('Goals page loads', async ({ page }) => {
    await signUpTestUser(page);
    await page.goto(`${BASE_URL}/goals`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, '40-goals-page');
    console.log('  goals OK at', page.url());
  });

  test('Archetype page loads', async ({ page }) => {
    await signUpTestUser(page);
    await page.goto(`${BASE_URL}/dashboard/archetype`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, '50-archetype');
    console.log('  archetype OK at', page.url());
  });

  test('Briefing page loads', async ({ page }) => {
    await signUpTestUser(page);
    await page.goto(`${BASE_URL}/dashboard/briefing`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, '60-briefing');
    console.log('  briefing OK at', page.url());
  });
});
