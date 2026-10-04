const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let browser;

(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const products = await (await page.request.get(`${base}/api/products/`)).json();
  assert.ok(products.length > 0);
  assert.ok(products.every(product => product.status !== 'draft'));
  assert.equal((await page.request.get(`${base}/api/products/?includeDrafts=1`)).status(), 401);
  await fs.mkdir('artifacts/responsive-catalogue', { recursive: true });

  for (const route of ['/', '/products/', `/product/${products[0].id}/`, '/cart/', '/contact/', '/about/', '/reviews/', '/room-planner/']) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `${route}: ${overflow}px overflow at ${width}px`);
      if (route === '/products/') {
        await page.locator('.sofa-detail-card').first().waitFor();
        const card = await page.locator('.sofa-detail-card').first().boundingBox();
        assert.ok(card.width >= 280, `Card is too narrow (${card.width}px) at ${width}px`);
      }
    }
    console.log(`PASS responsive widths: ${route}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/responsive-catalogue/home-mobile.png' });
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Armchairs', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeFocused();

  await page.goto(`${base}/products/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.locator('#catalogue-filters')).toBeVisible();
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.locator('#catalogue-filters')).toBeHidden();
  const card = page.locator('.sofa-detail-card').first();
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => card.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await card.screenshot({ path: 'artifacts/responsive-catalogue/card-mobile.png' });
  const swatches = card.getByRole('group').getByRole('button');
  if (await swatches.count() > 1) {
    const before = await card.getByRole('link', { name: 'View sofa', exact: true }).getAttribute('href');
    await swatches.nth(1).click();
    await expect(swatches.nth(1)).toHaveAttribute('aria-pressed', 'true');
    assert.notEqual(await card.getByRole('link', { name: 'View sofa', exact: true }).getAttribute('href'), before);
  }
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.getByRole('button', { name: 'List view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  if (products.length > 12) {
    await expect(page.locator('.sofa-detail-card')).toHaveCount(12);
    await page.getByRole('button', { name: 'Show more products' }).click();
    await expect(page.locator('.sofa-detail-card')).toHaveCount(Math.min(24, products.length));
  }
  await page.getByRole('searchbox', { name: 'Search sofas', exact: true }).fill('no-such-sofa-9999');
  await expect(page.getByRole('heading', { name: 'No sofas found just yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore all sofas', exact: true }).click();

  for (const category of ['Sofa Bed', 'Recliner', 'Sofa Sets', 'Armchairs', 'Footstools']) {
    await page.goto(`${base}/products/?category=${encodeURIComponent(category)}`, { waitUntil: 'networkidle' });
    const expected = products.filter(product => product.category === category || product.categories?.includes(category));
    await expect(page.locator('.sofa-detail-card')).toHaveCount(Math.min(12, expected.length));
  }
  const imported = products.find(product => product.source_site);
  if (imported) {
    await page.goto(`${base}/product/${imported.id}/`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'Ask about availability', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add to basket/ })).toHaveCount(0);
    const data = JSON.parse(await fs.readFile('.local-data/products.json', 'utf8'));
    const draft = data.find(product => product.status === 'draft');
    assert.equal((await page.request.get(`${base}/api/products/${draft.id}/`)).status(), 404);
    assert.equal(data.filter(product => product.source_site).length, 108);
  }

  for (const width of [390, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/products/`, { waitUntil: 'networkidle' });
    await page.locator('.catalogue-toolbar').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.sofa-detail-card img').first().evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: `artifacts/responsive-catalogue/products-${width}-light.png` });
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.screenshot({ path: `artifacts/responsive-catalogue/products-${width}-dark.png` });
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: navigation, filters, colour links, pagination, categories, availability enquiries, draft protection and both themes.');
  await browser.close();
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
