import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

await page.goto('https://8os.ai/onboarding', { waitUntil: 'networkidle', timeout: 20000 });
console.log('Final URL:', page.url());
console.log('Title:', await page.title());
await page.screenshot({ path: '/tmp/prod-current.png', fullPage: true });
const html = await page.content();
console.log('Length:', html.length);
const selects = await page.$$('select');
console.log('Number of <select> elements:', selects.length);
for (const s of selects) {
  const aria = await s.getAttribute('aria-label');
  console.log('SELECT aria-label="' + (aria || '') + '"');
}
const inputs = await page.$$('input[type=time]');
console.log('Number of <input type=time> elements:', inputs.length);
const allInputs = await page.$$eval('input', inputs => inputs.map(i => ({ type: i.type, placeholder: i.placeholder, ariaLabel: i.getAttribute('aria-label') })));
console.log('All inputs:', JSON.stringify(allInputs.slice(0, 10), null, 2));

console.log('---errors---');
errors.forEach(e => console.log(e));

await browser.close();
