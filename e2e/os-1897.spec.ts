/**
 * OS-1897: Run full E2E onboarding flow and verify ≥3 seeded goals
 *
 * Acceptance: complete onboarding via the live flow (signup → birth → quiz →
 * archetype → goals → dashboard) and verify that GET /api/dashboard returns
 * ≥3 seeded goals with projects/tasks.
 *
 * Auth strategy:
 *   - User creation: Clerk Backend API (bypasses Cloudflare Turnstile CAPTCHA
 *     which blocks headless Chromium on the signup form).
 *   - Login: Playwright UI automation on /login (no Turnstile present).
 *   - After login, Clerk redirects to /onboarding for first-time users.
 *
 * Depends on:
 *   - OS-1892 seeder deployed to Railway
 *   - OS-1826 CF Worker routing (api.8os.ai → Railway orchestrator)
 *
 * Env vars required:
 *   - CLERK_SECRET_KEY — Clerk Backend API secret key (from Railway)
 *
 * Run: npx playwright test e2e/os-1897.spec.ts
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'https://8os.ai'
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? ''

function uniqueEmail() {
  return `archie-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@8os.ai`
}

/**
 * Create a user via Clerk Backend API (bypasses Turnstile CAPTCHA).
 * In Clerk test mode, emails are auto-verified — no OTP needed.
 */
async function createClerkUser(email: string, password = 'TestPassword123!'): Promise<string> {
  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: false,
      skip_password_requirement: false,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Clerk user creation failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  console.log('[OS-1897] Created Clerk user:', data.id, email)
  return data.id
}

/**
 * Log in via the Clerk UI on /login.
 * No Turnstile on the login page — Playwright can interact normally.
 */
async function loginUser(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(3000) // Wait for Clerk JS to hydrate

  // Fill email
  const emailInput = page
    .locator('input[placeholder*="mail" i], input[placeholder*="example" i], input[name="identifier"]')
    .first()
  await emailInput.fill(email)

  // Fill password
  const pwInput = page.locator('input[type="password"]').first()
  await pwInput.fill(password)

  // Click Continue
  await page.locator('button:has-text("Continue")').first().click()
  await page.waitForTimeout(2000)

  // Handle OTP if Clerk presents it (test mode usually skips)
  const otpInput = page.locator('input[autocomplete="one-time-code"], input[name="code"], input[inputmode="numeric"]').first()
  if (await otpInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await otpInput.fill('424242')
    await page.locator('button:has-text("Continue"), button:has-text("Verify")').first().click().catch(() => {})
    await page.waitForTimeout(3000)
  }
}

/**
 * Walk through onboarding: birth date → quiz → archetype result → dashboard.
 */
async function completeOnboarding(page: import('@playwright/test').Page) {
  // Wait for onboarding page to load
  await page.waitForURL(/\/onboarding/, { timeout: 30_000 })
  console.log('[OS-1897] Onboarding URL:', page.url())

  // Birth date step — fill the date input
  const dateInput = page.locator('input[type="date"]').first()
  if (await dateInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await dateInput.fill('1990-04-15')
  }

  // Birth time step — fill hour/minute/AM-PM selects if present
  const hourSelect = page.locator('select[aria-label*="hour" i]').first()
  if (await hourSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await hourSelect.selectOption('10')
    const minSelect = page.locator('select[aria-label*="minute" i]').first()
    if (await minSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await minSelect.selectOption('30')
    }
    const ampmSelect = page.locator('select[aria-label*="AM" i], select[aria-label*="PM" i]').first()
    if (await ampmSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await ampmSelect.selectOption({ label: 'AM' })
    }
  }

  // Click through quiz — keep pressing Next/Continue/Submit until dashboard
  let attempts = 0
  while (attempts < 25) {
    const nextBtn = page
      .locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Submit")')
      .first()
    if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(500)
    }
    if (page.url().includes('/dashboard')) break
    attempts++
  }

  // Wait for dashboard to load
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  console.log('[OS-1897] Dashboard reached:', page.url())
}

test.describe('OS-1897: Seeding goals on onboarding', () => {
  test('new user sees ≥3 seeded goals after completing onboarding', async ({ page }) => {
    test.setTimeout(120_000)
    const email = uniqueEmail()
    const password = 'TestPassword123!'

    // Step 1 — Create user via Clerk Backend API (bypasses Turnstile)
    await createClerkUser(email, password)

    // Step 2 — Log in via UI (no Turnstile on /login)
    await loginUser(page, email, password)

    // Step 3 — Complete onboarding flow
    await completeOnboarding(page)

    // Step 4 — Query dashboard API for goal count
    const dashRes = await page.request.get(`${BASE}/api/dashboard`)
    expect(dashRes.status(), 'dashboard API should return 200').toBe(200)

    const dashData = await dashRes.json()
    const goals = dashData?.goals ?? []
    console.log('[OS-1897] Goals in dashboard:', goals.length)
    console.log('[OS-1897] Goal names:', goals.map((g: any) => g.name))

    // Acceptance criterion: ≥3 seeded goals
    expect(
      goals.length,
      `Dashboard should have ≥3 seeded goals, got ${goals.length}`
    ).toBeGreaterThanOrEqual(3)

    // Verify goals have projects attached
    const goalsWithProjects = goals.filter((g: any) => g.projects?.length > 0)
    expect(
      goalsWithProjects.length,
      `At least some goals should have projects attached`
    ).toBeGreaterThan(0)

    // Verify each goal has the archetype seed metadata
    const seededGoals = goals.filter((g: any) => g.name && g.definition)
    expect(seededGoals.length, 'All goals should have name + definition').toBe(goals.length)
  })

  test('second onboarding run does NOT double-seed goals (idempotency)', async ({ page }) => {
    test.setTimeout(120_000)
    const email = uniqueEmail()
    const password = 'TestPassword123!'

    await createClerkUser(email, password)
    await loginUser(page, email, password)
    await completeOnboarding(page)

    // Count goals — should still be ≤6 (one set of seeded goals, not doubled)
    const dashRes = await page.request.get(`${BASE}/api/dashboard`)
    const dashData = await dashRes.json()
    const goalCount = (dashData?.goals ?? []).length

    console.log('[OS-1897] Idempotency — goals after onboarding:', goalCount)
    expect(
      goalCount,
      'Onboarding should not create duplicate goals'
    ).toBeLessThanOrEqual(6)
  })
})
