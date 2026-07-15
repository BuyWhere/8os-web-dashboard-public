import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

try {
  // First try going through login to reach /onboarding
  await page.goto('https://8os.ai/login', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('LOGIN status:', page.url());
  await page.screenshot({ path: '/tmp/prod-1-login.png' });
} catch (e) {
  console.log('LOGIN error:', e.message);
}

// Try direct /onboarding (will be redirected by Clerk)
try {
  const r = await page.goto('https://8os.ai/onboarding', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('ONBOARDING status:', r?.status());
  console.log('ONBOARDING URL:', page.url());
  await page.screenshot({ path: '/tmp/prod-2-onboarding.png', fullPage: true });
  // Inspect DOM
  const selects = await page.$$('select');
  console.log('Number of <select> elements:', selects.length);
  for (const s of selects) {
    const aria = await s.getAttribute('aria-label');
    const opts = await s.$$eval('option', els => els.map(e => e.textContent));
    console.log('SELECT aria-label="' + (aria || '') + '" options:', opts.slice(0, 6).join(', '));
  }
  const inputs = await page.$$('input[type=time]');
  console.log('Number of <input type=time> elements:', inputs.length);
} catch (e) {
  console.log('ONBOARDING error:', e.message);
}

console.log('---errors---');
errors.forEach(e => console.log(e));

await browser.close();
