const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const sizes = [
    { name: '320', w: 320, h: 568 },
    { name: '390-mobile', w: 390, h: 844 },
    { name: '640', w: 640, h: 800 },
    { name: '768-tablet', w: 768, h: 900 },
    { name: '1024', w: 1024, h: 768 },
    { name: '1280', w: 1280, h: 800 },
    { name: '1440-desktop', w: 1440, h: 900 },
  ];
  const results = [];
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
    const page = await ctx.newPage();
    await page.goto('https://buywhere.ai/best-robot-vacuums-2026?cb=' + Date.now(), { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find(x => x.textContent && x.textContent.includes('Live catalog snapshot'));
      sec.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find(x => x.textContent && x.textContent.includes('Live catalog snapshot'));
      const cards = [...sec.querySelectorAll('a.group.grid')];
      const vh = window.innerHeight;
      // Find any CTA whose bottom is below viewport
      const clipped = cards.map((c, i) => {
        const cta = c.querySelector('[role="button"]');
        if (!cta) return null;
        const r = cta.getBoundingClientRect();
        return { i, ctaText: cta.textContent.trim().slice(0,40), bottom: r.bottom, clipped: r.bottom > vh };
      }).filter(Boolean);
      return {
        vh,
        sectionH: sec.offsetHeight,
        cardsCount: cards.length,
        clipped,
        firstCardRect: cards[0] ? cards[0].getBoundingClientRect() : null,
        firstCtaRect: cards[0] ? (()=>{const c=cards[0].querySelector('[role="button"]');return c?c.getBoundingClientRect():null})() : null,
      };
    });
    results.push({ ...s, ...info });
    await page.screenshot({ path: `/home/paperclip/.claude/projects/-paperclip-instances-default-workspaces-25f3fbb9-d5f6-46cb-9b9d-6b35db7d38be/evidence-BUY-65457/after-${s.name}.png`, fullPage: false });
    await ctx.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
