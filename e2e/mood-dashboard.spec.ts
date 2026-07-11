/**
 * e2e/mood-dashboard.spec.ts — E-9 authed dashboard render check (backlog §5).
 *
 * Signs up a fresh user via Clerk dev test mode; if signup bounces to the login
 * page (Clerk test-mode sometimes creates the account without an auto-session),
 * signs IN with the same credentials. Then goes to /dashboard and asserts:
 *   - authed on /dashboard (not bounced to login),
 *   - no Next error boundary ("Something went wrong" / "Application error"),
 *   - the E-9 mood strip [data-testid="mood-strip"] is present (a fresh user
 *     sees its empty-state, still the mood-strip node),
 *   - no uncaught page errors.
 *
 * Run: railway run npx playwright test e2e/mood-dashboard.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test'

const BASE_URL = 'https://8os.ai'
const EMAIL = `qa-e9-${Date.now()}+clerk_test@8os.ai`
const PASSWORD = 'QaTest!2345xyz'

async function fillCredsAndContinue(page: import('@playwright/test').Page) {
  await page.locator('input[placeholder*="mail" i], input[name="identifier"]').first().fill(EMAIL)
  const pw = page.locator('input[type="password"]').first()
  if (await pw.count()) await pw.fill(PASSWORD)
  await page.getByRole('button', { name: 'Continue', exact: true }).first().click().catch(() => {})
  await page.waitForTimeout(6000)
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  // OTP step (Clerk test code 424242) if shown.
  const otp = page.locator('input[autocomplete="one-time-code"], input[name="code"], input[inputmode="numeric"]')
  if ((await otp.count()) > 0) {
    await otp.first().fill('424242').catch(async () => {
      const boxes = page.locator('input[maxlength="1"]')
      const code = '424242'
      for (let i = 0; i < code.length; i++) await boxes.nth(i).fill(code[i]).catch(() => {})
    })
    await page.getByRole('button', { name: /Continue|Verify/i }).first().click().catch(() => {})
    await page.waitForTimeout(6000)
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  }
}

test('E-9: /dashboard renders the mood strip authed, no error boundary', async ({ page }) => {
  test.setTimeout(150000)
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)))

  // 1) Sign up.
  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
  await fillCredsAndContinue(page)
  console.log('  post-signup URL:', page.url())

  // 2) If bounced to login, sign in with the same creds (account exists in Clerk).
  if (page.url().includes('/login') || page.url().includes('/signup')) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await fillCredsAndContinue(page)
    console.log('  post-login URL:', page.url())
  }

  // 3) Dashboard.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const url = page.url()
  expect(url, 'should be authed on /dashboard (not bounced to login)').toContain('/dashboard')

  const bodyText = (await page.textContent('body')) ?? ''
  expect(bodyText, 'no error boundary').not.toContain('Something went wrong')
  expect(bodyText, 'no application error').not.toContain('Application error')

  const strip = page.locator('[data-testid="mood-strip"]')
  await expect(strip, 'mood strip present on dashboard').toBeVisible({ timeout: 15000 })

  expect(pageErrors, `no page errors: ${pageErrors.join(' | ')}`).toEqual([])
  console.log('[E-9] dashboard mood strip rendered OK at', url)
})
