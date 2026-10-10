const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
let browser;

async function loadPageImages(page) {
  await page.locator('img').evaluateAll(async images => {
    await Promise.all(images.map(image => {
      image.loading = 'eager';
      if (image.complete) return;
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
  const broken = await page.locator('img').evaluateAll(images => images.filter(image => !image.naturalWidth).map(image => image.src));
  if (broken.length) throw new Error(`Broken images: ${broken.join(', ')}`);
}

(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const products = await (await page.request.get(`${base}/api/products/`)).json();
  const product = products[0];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await fs.mkdir('artifacts', { recursive: true });

  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /Comfort Starts with the Right Furniture/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Homepage navigation' })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search furniture' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your room. Beautifully planned.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open basket/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Plan my room' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Homepage navigation' }).getByRole('link', { name: 'Reviews', exact: true })).toBeVisible();
  await expect(page.locator('.category-orbit-grid article')).toHaveCount(6);
  await expect(page.locator('.category-orbit-details')).toHaveCount(6);
  await expect(page.locator('.collection-tabs')).toHaveCount(0);
  await expect(page.locator('.featured-grid article')).toHaveCount(Math.min(3, products.length));
  await loadPageImages(page);
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });

  await page.getByRole('button', { name: /^Open basket/ }).click();
  await expect(page.getByRole('dialog', { name: 'Your basket' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Your basket' })).toBeHidden();
  await page.getByRole('searchbox', { name: 'Search furniture' }).fill('corner');
  await page.getByRole('button', { name: 'Search furniture', exact: true }).click();
  await page.waitForURL(/\/products\/?\?q=corner/);
  await expect(page.getByRole('searchbox', { name: 'Search sofas', exact: true })).toHaveValue('corner');

  await page.goto(`${base}/product/${product.id}`, { waitUntil: 'networkidle' });
  const categories = page.getByRole('navigation', { name: 'All sofa categories' });
  await expect(categories).toBeVisible();
  await expect(categories.getByRole('link')).toHaveCount(8);
  await loadPageImages(page);
  await page.screenshot({ path: 'artifacts/product-desktop.png', fullPage: true });

  await page.goto(base, { waitUntil: 'networkidle' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 1) throw new Error(`Home horizontal overflow: ${overflow}px at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await loadPageImages(page);
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });

  const broken = await page.locator('img').evaluateAll(images => images.filter(image => image.complete && !image.naturalWidth).map(image => image.src));
  if (broken.length) throw new Error(`Broken images: ${broken.join(', ')}`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: reference homepage, compact navigation, collections, product categories and responsive layouts.');
  await browser.close();
})().catch(async error => {
  console.error(error);
  await browser?.close();
  process.exit(1);
});
