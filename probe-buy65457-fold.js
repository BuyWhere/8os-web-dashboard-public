const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://buywhere.ai/best-robot-vacuums-2026', { waitUntil: 'networkidle', timeout: 60000 });
  // Find LIVE CATALOG SNAPSHOT and scroll to position section at top of viewport
  await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s => s.textContent && s.textContent.includes('Live catalog snapshot'));
    sec.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/paperclip/.claude/projects/-paperclip-instances-default-workspaces-25f3fbb9-d5f6-46cb-9b9d-6b35db7d38be/evidence-BUY-65457/snapshot-fold-1440.png' });
  // Now scroll halfway through the section
  await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s => s.textContent && s.textContent.includes('Live catalog snapshot'));
    window.scrollBy(0, sec.offsetHeight - 400);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/home/paperclip/.claude/projects/-paperclip-instances-default-workspaces-25f3fbb9-d5f6-46cb-9b9d-6b35db7d38be/evidence-BUY-65457/snapshot-bottom-1440.png' });
  // At the very bottom of section
  await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s => s.textContent && s.textContent.includes('Live catalog snapshot'));
    const r = sec.getBoundingClientRect();
    window.scrollBy(0, sec.offsetHeight);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/home/paperclip/.claude/projects/-paperclip-instances-default-workspaces-25f3fbb9-d5f6-46cb-9b9d-6b35db7d38be/evidence-BUY-65457/just-after-section-1440.png' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
