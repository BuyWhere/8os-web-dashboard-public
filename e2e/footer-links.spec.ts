import { test, expect } from '@playwright/test';

const productLinks = [
  { label: 'Features', path: '/features' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Reveal', path: '/reveal' },
];

const companyLinks = [
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
];

const footerLinks = [...productLinks, ...companyLinks];

const publicPages = ['/', '/features', '/blog', '/contact', '/privacy', '/terms', '/quiz'];

test('all footer links return 200', async ({ request }) => {
  for (const link of footerLinks) {
    const response = await request.get(link.path);
    expect(response.status(), `${link.label} (${link.path}) should return 200`).toBe(200);
  }
});

for (const pagePath of publicPages) {
  test(`shared Product/Company footer on ${pagePath}`, async ({ page }) => {
    await page.goto(pagePath);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Product');
    await expect(footer).toContainText('Company');

    for (const link of footerLinks) {
      const anchor = footer.locator(`a[href="${link.path}"]`);
      await expect(anchor, `footer link to ${link.path} on ${pagePath}`).toBeVisible();
    }

    await expect(footer.locator('footer')).toHaveCount(0);
  });
}
