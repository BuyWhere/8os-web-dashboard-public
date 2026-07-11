import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

const email = `qa-${Date.now()}+clerk_test@8os.ai`;
const password = 'QaTest!2345xyz';

console.log('=== Signup ===');
await page.goto('https://8os.ai/signup', { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

const emailInput = page.locator('input[placeholder*="mail" i], input[name="identifier"]').first();
await emailInput.fill(email);
const pwInput = page.locator('input[type="password"]').first();
await pwInput.fill(password);
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(8000);
console.log('After signup URL:', page.url());

// Try OTP
const otp = page.locator('input[autocomplete="one-time-code"], input[name="code"]');
if (await otp.count() > 0) {
  console.log('OTP step found, entering 424242');
  await otp.first().fill('424242');
  await page.waitForTimeout(5000);
}
console.log('Final URL:', page.url());
await page.screenshot({ path: '/tmp/prod-onb-real.png', fullPage: true });

// Inspect the page
const html = await page.content();
console.log('Page length:', html.length);
const title = await page.title();
console.log('Title:', title);

const inputs = await page.$$eval('input', inputs => inputs.map(i => ({
  type: i.type,
  placeholder: i.placeholder,
  ariaLabel: i.getAttribute('aria-label'),
  name: i.name,
})));
console.log('All inputs:', JSON.stringify(inputs, null, 2));

const selects = await page.$$eval('select', selects => selects.map(s => ({
  ariaLabel: s.getAttribute('aria-label'),
  options: Array.from(s.options).map(o => o.text),
  value: s.value,
})));
console.log('All selects:', JSON.stringify(selects, null, 2));

console.log('---errors---');
errors.forEach(e => console.log(e));

await browser.close();
