const { chromium, expect } = require('@playwright/test');
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const categories = ['2-Seater', '3-Seater', 'Corner', 'U-Shape', 'Recliner', 'Sofa Bed', 'Sofa Sets', 'Armchairs', 'Footstools'];
let browser;
(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  // Isolated catalogue fixtures: no real products or authentication records are changed.
  await page.route(/\/api\/products\/?(?:\?includeDrafts=1)?$/, route => route.fulfill({ json: categories.map((category, index) => ({
    id: `fixture-${index}`, slug: `fixture-${index}`, title: `Fixture ${category}`, category,
    description: 'Category verification', base_price: 500, images: ['/images/sofas/premium-sofa-bed.webp'], variants: [],
  })) }));
  for (const category of ['U-Shape', 'Sofa Bed']) {
    await page.goto(`${base}/products/?category=${encodeURIComponent(category)}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: category === 'Sofa Bed' ? 'Sofa beds' : `${category} sofas`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: `Fixture ${category}`, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fixture 2-Seater', exact: true })).toHaveCount(0);
  }
  await page.addInitScript(() => {
    localStorage.setItem('admin_token', 'isolated-category-ui-check');
    localStorage.setItem('admin_token_expires', String(Date.now() + 60000));
  });
  await page.goto(`${base}/admin/products/`, { waitUntil: 'networkidle' });
  const select = page.locator('#product-category');
  if (!await select.isVisible()) await page.getByRole('button', { name: /add|new product/i }).first().click();
  await expect(select.locator('option')).toHaveText(categories);
  for (const category of categories) {
    await select.selectOption(category);
    await expect(select).toHaveValue(category);
  }
  console.log('PASS: six admin categories and isolated U-shape/Sofa Bed catalogue filtering.');
  await browser.close();
})().catch(async error => { console.error(error); await browser?.close(); process.exit(1); });
