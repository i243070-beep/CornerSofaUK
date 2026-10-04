const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/data/product-room-images.json'), 'utf8'));
  const products = await (await fetch(`${base}/api/products/`)).json();
  assert.ok(products.length > 0);
  if (process.argv.includes('--complete')) {
    const plan = JSON.parse(await fs.readFile(path.join(root, 'artifacts/room-refresh/plan.json'), 'utf8'));
    const missing = plan.filter(item => !item.keep && !manifest[item.source]);
    assert.deepEqual(missing.map(item => item.index), [], 'Unfinished planned replacements');
    const reviewed = new Set(plan.flatMap(item => [item.source, manifest[item.source]].filter(Boolean)));
    const originals = JSON.parse(await fs.readFile(path.join(root, '.local-data/products.json'), 'utf8'));
    for (const product of products) {
      assert.ok(reviewed.has(product.images[0]), `Unreviewed hero: ${product.title}`);
      const original = originals.find(item => item.id === product.id);
      assert.ok(original, `Missing source record: ${product.title}`);
      assert.equal(product.images[0], manifest[original.images[0]] || original.images[0], `Hero replacement not served: ${product.title}`);
      assert.ok(product.images.includes(original.images[0]), `Original missing from gallery: ${product.title}`);
      for (const variant of product.variants) {
        if (variant.images?.length) assert.ok(reviewed.has(variant.images[0]), `Unreviewed colour option: ${product.title} / ${variant.color}`);
        const sourceVariant = original.variants.find(item => item.id === variant.id);
        if (sourceVariant?.images?.length) assert.equal(variant.images[0], manifest[sourceVariant.images[0]] || sourceVariant.images[0], `Colour replacement not served: ${product.title} / ${variant.color}`);
      }
    }
  }
  for (const [source, replacement] of Object.entries(manifest)) {
    const meta = await sharp(path.join(root, 'public', replacement)).metadata();
    assert.ok(meta.width >= 1000 && meta.height >= 1000, `Small image: ${replacement}`);
    const sourceFile = source.startsWith('/api/sofa-previews/') ? path.join(root, '.local-data/sofa-previews', path.basename(source)) : path.join(root, 'public', source);
    await fs.access(sourceFile);
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/products/?q=Salone`, { waitUntil: 'networkidle' });
    const cards = page.locator('.sofa-detail-card');
    await expect(cards).toHaveCount(7);
    for (const card of await cards.all()) {
      const img = card.locator('img').first();
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('src', /\/images\/catalogue-rooms\//);
      await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBeTruthy();
    }
    await page.locator('.catalogue-sofa-grid').screenshot({ path: path.join(root, 'artifacts/room-refresh/salone-desktop.png') });
    const roma = products.find(p => p.title === 'Roma Black Leather 5 Seater Corner Recliner Sofa');
    assert.ok(roma);
    await page.goto(`${base}/product/${roma.id}/`, { waitUntil: 'networkidle' });
    const hero = page.locator('.product-detail-page img').first();
    await expect(hero).toHaveAttribute('src', /catalogue-rooms/);
    await expect.poll(() => hero.evaluate(el => el.complete && el.naturalWidth > 0)).toBeTruthy();
    await page.getByRole('button', { name: 'Next product image', exact: true }).click();
    await expect(hero).toHaveAttribute('src', /7f7cc8ecfeeae57df6e6dd90/);
    await page.getByRole('button', { name: 'Previous product image', exact: true }).click();
    await page.screenshot({ path: path.join(root, 'artifacts/room-refresh/roma-product-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/products/?q=Salone`, { waitUntil: 'networkidle' });
    await cards.first().scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile overflow');
    await cards.first().screenshot({ path: path.join(root, 'artifacts/room-refresh/salone-mobile.png') });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ catalogueProducts: products.length, replacements: Object.keys(manifest).length, checks: ['all replacement files readable and high resolution', 'originals retained', '7 Salone card images load', 'product gallery uses replacement and original', 'mobile layout fits', 'no browser errors'] }, null, 2));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
