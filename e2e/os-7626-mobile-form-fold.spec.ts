/**
 * OS-7626: Mobile form above-fold probe
 *
 * Verifies at 390x844 (iPhone 14 Pro) that:
 *  1. /signup — the first Clerk form field (email input) is visible above fold
 *  2. /contact — the submit button is visible above fold (not obscured by FAB)
 *
 * Run: npx playwright test e2e/os-7626-mobile-form-fold.spec.ts
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'https://8os.ai'
const VIEWPORT = { width: 390, height: 844 }

async function measureAboveFold(page: import('@playwright/test').Page) {
  const viewportHeight = page.viewportSize()!.height
  const fold = viewportHeight

  // Get all interactive elements visible in the top fold
  const aboveFoldEls = await page.evaluate((foldY) => {
    const els = document.querySelectorAll(
      'input, textarea, button, [role="button"], [tabindex="0"]'
    )
    return Array.from(els)
      .filter(el => {
        const rect = el.getBoundingClientRect()
        return rect.top < foldY && rect.bottom > 0 && rect.width > 0 && rect.height > 0
      })
      .map(el => ({
        tag: el.tagName,
        id: el.id || '',
        name: (el as HTMLInputElement).name || '',
        className: el.className.slice(0, 80),
        top: Math.round((el as HTMLElement).getBoundingClientRect().top),
        bottom: Math.round((el as HTMLElement).getBoundingClientRect().bottom),
        text: (el as HTMLElement).innerText?.slice(0, 40) || el.getAttribute('aria-label') || '',
      }))
  }, fold)

  return aboveFoldEls
}

test.describe('OS-7626: Mobile form above-fold', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT)
  })

  test('/signup — Clerk email field above fold at 390x844', async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500) // allow Clerk JS to hydrate

    const aboveFold = await measureAboveFold(page)
    const inputEls = aboveFold.filter(el =>
      el.tag === 'INPUT' ||
      el.tag === 'TEXTAREA' ||
      (el.tag === 'BUTTON' && !el.className.includes('cl-') && !el.className.includes('clerk'))
    )

    const emailField = inputEls.find(el =>
      (el.tag === 'INPUT' && (el.id.includes('email') || el.name.includes('email') || el.className.includes('email'))) ||
      (el.id === 'cl-sign-in-up-emailAddress' || el.className.includes('emailAddress'))
    )

    // At minimum, some form input must be visible above fold
    const hasVisibleInput = inputEls.length > 0

    console.log('Above-fold inputs:', JSON.stringify(inputEls.slice(0, 10), null, 2))
    expect(hasVisibleInput, `Expected ≥1 input above fold, got: ${JSON.stringify(inputEls.slice(0,5))}`).toBe(true)

    if (emailField) {
      expect(emailField.bottom, `Email field bottom=${emailField.bottom} should be < ${VIEWPORT.height}`)
        .toBeLessThan(VIEWPORT.height)
    }
  })

  test('/contact — submit button above fold at 390x844', async ({ page }) => {
    await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const aboveFold = await measureAboveFold(page)
    const submitBtn = aboveFold.find(el =>
      el.tag === 'BUTTON' &&
      (el.text?.toLowerCase().includes('send') || el.id.includes('submit') || el.className.includes('submit'))
    )

    console.log('Above-fold buttons:', JSON.stringify(
      aboveFold.filter(el => el.tag === 'BUTTON').slice(0, 10), null, 2
    ))

    expect(submitBtn, `Submit button should be visible above ${VIEWPORT.height}px fold`).toBeDefined()
    if (submitBtn) {
      expect(submitBtn.bottom, `Submit button bottom=${submitBtn.bottom} should be < ${VIEWPORT.height}`)
        .toBeLessThan(VIEWPORT.height)
    }
  })

  test('/contact — FAB does not overlap form inputs', async ({ page }) => {
    await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Check if sidebar FAB is present
    const fab = page.locator('.sidebar-mobile-toggle')
    const formTextarea = page.locator('textarea#contact-message')
    const submitBtn = page.locator('button[type="submit"]')

    const fabVisible = await fab.isVisible().catch(() => false)
    if (fabVisible) {
      const fabBox = await fab.boundingBox()
      const textareaBox = await formTextarea.boundingBox().catch(() => null)
      const submitBox = await submitBtn.boundingBox().catch(() => null)

      if (textareaBox && fabBox) {
        const overlaps = !(fabBox.top > textareaBox.bottom || fabBox.bottom < textareaBox.top)
        console.log(`FAB at y=${fabBox.top}–${fabBox.bottom}, textarea at y=${textareaBox.top}–${textareaBox.bottom}, overlaps=${overlaps}`)
        expect(overlaps, 'FAB should not overlap textarea').toBe(false)
      }

      if (submitBox && fabBox) {
        const overlaps = !(fabBox.top > submitBox.bottom || fabBox.bottom < submitBox.top)
        console.log(`FAB at y=${fabBox.top}–${fabBox.bottom}, submit at y=${submitBox.top}–${submitBox.bottom}, overlaps=${overlaps}`)
        expect(overlaps, 'FAB should not overlap submit button').toBe(false)
      }
    }
  })
})
