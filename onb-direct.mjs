import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Try /onboarding/birth directly without auth
const r = await page.goto('https://8os.ai/onboarding/birth', { waitUntil: 'networkidle', timeout: 15000 });
console.log('/onboarding/birth status:', r?.status(), 'URL:', page.url());

// Try /onboarding without auth
const r2 = await page.goto('https://8os.ai/onboarding', { waitUntil: 'networkidle', timeout: 15000 });
console.log('/onboarding status:', r2?.status(), 'URL:', page.url());

// Auth setup - use the Clerk test mode via API
// First, check if we can get an authenticated session by hitting /api routes
await browser.close();
