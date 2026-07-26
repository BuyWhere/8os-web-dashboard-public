import { test, expect } from '@playwright/test';

const coreArchetypes = [
  'Strategic Commander',
  'Nurturing Creative',
  'Steady Achiever',
  'Harmonizer Guardian',
  'Earth Anchor',
];

test('/archetypes/explorer page loads and shows archetypes', async ({ page }) => {
  const response = await page.goto('/archetypes/explorer');
  expect(response?.status()).toBe(200);

  await expect(page.locator('h1', { hasText: 'Archetype Explorer' })).toBeVisible();

  for (const name of coreArchetypes) {
    await expect(page.locator(`text=${name}`)).toBeVisible();
  }
});



test('/archetypes/explorer renders all five archetype cards above the fold at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/archetypes/explorer');

  const viewportHeight = await page.evaluate(() => window.innerHeight);

  for (const name of coreArchetypes) {
    const card = page.locator('article', { hasText: name });
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box, `card "${name}" has no bounding box`).not.toBeNull();
    expect(box!.y + box!.height, `${name} extends below the fold (y=${box!.y}, h=${box!.height}, viewport=${viewportHeight})`).toBeLessThanOrEqual(viewportHeight);
  }
});

test('/archetype-explorer legacy route renders the full explorer', async ({ page }) => {
  const response = await page.goto('/archetype-explorer');
  expect(response?.status()).toBe(200);

  await expect(page.locator('h1', { hasText: 'Archetype Explorer' })).toBeVisible();

  for (const name of coreArchetypes) {
    await expect(page.locator(`text=${name}`)).toBeVisible();
  }
});

test('/archetypes/explorer CTA links to /onboarding', async ({ page }) => {
  await page.goto('/archetypes/explorer');

  const ctaLink = page.locator('a', { hasText: 'Generate My Life OS, Free' });
  await expect(ctaLink).toBeVisible();
  await expect(ctaLink).toHaveAttribute('href', '/onboarding');
});

test('/archetypes/explorer back link works', async ({ page }) => {
  await page.goto('/archetypes/explorer');

  const backLink = page.locator('a', { hasText: '← Back to 8os' });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL(new URL('/', process.env.PLAYWRIGHT_BASE_URL ?? 'https://8os.ai').toString());
});
