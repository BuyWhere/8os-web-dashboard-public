const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const sizes = [
    { name: '320-iphone-se', w: 320, h: 568 },
    { name: '375-iphone', w: 375, h: 667 },
    { name: '390-iphone-pro', w: 390, h: 844 },
    { name: '480', w: 480, h: 800 },
    { name: '640', w: 640, h: 800 },
    { name: '768-tablet', w: 768, h: 900 },
    { name: '900', w: 900, h: 800 },
    { name: '1024', w: 1024, h: 768 },
    { name: '1280', w: 1280, h: 800 },
    { name: '1440', w: 1440, h: 900 },
    { name: '1920', w: 1920, h: 1080 },
  ];
  const results = [];
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
    const page = await ctx.newPage();
    await page.goto('https://buywhere.ai/best-robot-vacuums-2026', { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find(x => x.textContent && x.textContent.includes('Live catalog snapshot'));
      sec.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find(x => x.textContent && x.textContent.includes('Live catalog snapshot'));
      const cards = [...sec.querySelectorAll('a.group.grid')];
      const vh = window.innerHeight;
      return {
        vh,
        sectionH: sec.offsetHeight,
        cardsCount: cards.length,
        firstCard: cards[0] ? { rect: cards[0].getBoundingClientRect(), cta: (() => { const c = cards[0].querySelector('[role="button"]'); return c ? { text: c.textContent.trim(), rect: c.getBoundingClientRect() } : null; })() } : null,
      };
    });
    results.push({ ...s, ...info });
    await page.screenshot({ path: `/home/paperclip/.claude/projects/-paperclip-instances-default-workspaces-25f3fbb9-d5f6-46cb-9b9d-6b35db7d38be/evidence-BUY-65457/vp-${s.name}.png`, fullPage: false });
    await ctx.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
