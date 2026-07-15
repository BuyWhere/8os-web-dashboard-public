import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  storageState: undefined,
});
const page = await ctx.newPage();

const requests = [];
page.on('request', r => requests.push(r.url()));

await page.goto('https://8os.ai/onboarding', { waitUntil: 'networkidle', timeout: 20000 });
console.log('Final URL:', page.url());
console.log('Title:', await page.title());
await page.screenshot({ path: '/tmp/prod-onb-full.png', fullPage: true });
const html = await page.content();
console.log('HTML length:', html.length);

// What scripts loaded?
const scripts = await page.$$eval('script', s => s.map(e => e.src).filter(Boolean));
console.log('Scripts:', scripts.slice(0, 20).join('\n  '));

// Find any 'onboarding' references
console.log('---onboarding references in HTML---');
const matches = html.match(/[^"]*onboarding[^"]*/gi) || [];
console.log(matches.slice(0, 10).join('\n'));

console.log('---request URLs containing "onboarding"---');
console.log(requests.filter(u => u.includes('onboarding')).slice(0, 10).join('\n'));

await browser.close();
