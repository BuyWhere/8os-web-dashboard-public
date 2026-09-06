const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://buywhere.ai/best-robot-vacuums-2026', { waitUntil: 'networkidle', timeout: 60000 });
  // Find LIVE CATALOG SNAPSHOT heading
  const heading = page.locator('text=Live catalog snapshot').first();
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  // Get bounding box of section
  const sectionInfo = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s => s.textContent && s.textContent.includes('Live catalog snapshot'));
    if (!sec) return null;
    const r = sec.getBoundingClientRect();
    const cards = [...sec.querySelectorAll('a.group.grid')];
    return {
      section: { top: r.top, bottom: r.bottom, height: r.height },
      cards: cards.map((c, i) => {
        const cr = c.getBoundingClientRect();
        const cta = c.querySelector('[role="button"], .font-semibold.text-white, .font-medium.text-amber-700, span[class*="rounded-full"]');
        const ctaR = cta ? cta.getBoundingClientRect() : null;
        return {
          i, top: cr.top, bottom: cr.bottom, height: cr.height,
          ctaText: cta ? cta.textContent.trim() : null,
          ctaTop: ctaR ? ctaR.top : null,
          ctaBottom: ctaR ? ctaR.bottom : null,
        };
      }),
    };
  });
  console.log(JSON.stringify(sectionInfo, null, 2));
  await page.screenshot({ path: '/home/paperclip/.claude/projects/-paperclip-instances-default-workspaces-25f3fbb9-d5f6-46cb-9b9d-6b35db7d38be/evidence-BUY-65457/before-desktop.png', fullPage: true });
  // Also at mobile
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  await page2.goto('https://buywhere.ai/best-robot-vacuums-2026', { waitUntil: 'networkidle', timeout: 60000 });
  const heading2 = page2.locator('text=Live catalog snapshot').first();
  await heading2.scrollIntoViewIfNeeded();
  await page2.waitForTimeout(500);
  const m = await page2.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s => s.textContent && s.textContent.includes('Live catalog snapshot'));
    if (!sec) return null;
    const r = sec.getBoundingClientRect();
    const cards = [...sec.querySelectorAll('a.group.grid')];
    return {
      section: { top: r.top, bottom: r.bottom, height: r.height },
      cards: cards.map((c, i) => {
        const cr = c.getBoundingClientRect();
        const cta = c.querySelector('[role="button"], .font-semibold.text-white, .font-medium.text-amber-700, span[class*="rounded-full"]');
        const ctaR = cta ? cta.getBoundingClientRect() : null;
        return { i, top: cr.top, bottom: cr.bottom, height: cr.height, ctaText: cta ? cta.textContent.trim() : null, ctaTop: ctaR ? ctaR.top : null, ctaBottom: ctaR ? ctaR.bottom : null };
      }),
    };
  });
  console.log('--- MOBILE 390x844 ---');
  console.log(JSON.stringify(m, null, 2));
  await page2.screenshot({ path: '/home/paperclip/.claude/projects/-paperclip-instances-default-workspaces-25f3fbb9-d5f6-46cb-9b9d-6b35db7d38be/evidence-BUY-65457/before-mobile.png', fullPage: true });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
