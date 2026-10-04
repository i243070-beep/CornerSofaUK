const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const {
  frontend, artifacts, actualProductsFile, fingerprint, freePort, stopServer,
  waitForServer, assertNoOverflow, expectPhoto, submitEditor,
} = require('./verify-product-options.cjs');

// Real generated images and browser saves use a separate catalogue and preview
// directory. Only the explicitly labelled race check intercepts generation.
const runId = `${Date.now()}-${process.pid}`;
const dataDirectory = path.join(artifacts, `auto-colours-data-${runId}`);
const productsFile = path.join(dataDirectory, 'products.json');
const password = 'auto-colour-test-only';
const title = 'Automatic Colour Test Sofa';
const source = '/images/sofas/premium-three-seater.webp';
const blue = '#497fbd';
const green = '#6a7358';
const previewPattern = /^\/api\/sofa-previews\/[a-f0-9]{64}\.webp\/?$/;
const generationTimeout = 300000;

function colourFields(admin, index) {
  return admin.locator(`#colour-${index}-name`).locator('xpath=ancestor::fieldset[1]');
}

async function chooseGeneratedColour(admin, index, colour) {
  const responsePromise = admin.waitForResponse((response) => {
    if (response.request().method() !== 'POST' || new URL(response.url()).pathname !== '/api/sofa-previews/') return false;
    return response.request().postDataJSON()?.color === colour;
  }, { timeout: generationTimeout });
  await admin.locator(`#colour-${index}-swatch`).fill(colour);
  const response = await responsePromise;
  const result = await response.json();
  assert.ok(response.ok(), `Preview generation failed: ${JSON.stringify(result)}`);
  assert.match(result.url, previewPattern);
  await expect(admin.locator(`#colour-${index}-image`)).toHaveValue(result.url);
  await expect(admin.locator(`#colour-${index}-image`)).toHaveAttribute('readonly', '');
  await expectPhoto(colourFields(admin, index).locator('img'), result.url);
  return result.url;
}

async function verifyWebp(context, origin, url) {
  const response = await context.request.get(new URL(url, origin).href);
  assert.equal(response.status(), 200);
  assert.match(response.headers()['content-type'], /^image\/webp/);
  const bytes = await response.body();
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
}

async function verifyLatestColourWins(admin, blueUrl, greenUrl) {
  let markOldStarted;
  let releaseOld;
  let markOldFinished;
  const oldStarted = new Promise((resolve) => { markOldStarted = resolve; });
  const oldRelease = new Promise((resolve) => { releaseOld = resolve; });
  const oldFinished = new Promise((resolve) => { markOldFinished = resolve; });
  const pattern = '**/api/sofa-previews/';
  await admin.route(pattern, async (route) => {
    const colour = route.request().postDataJSON().color;
    if (colour === '#be3737') {
      markOldStarted();
      await oldRelease;
      try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: greenUrl }) }); }
      catch { /* The old request may correctly have been aborted by the editor. */ }
      finally { markOldFinished(); }
    } else {
      assert.equal(colour, blue);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: blueUrl }) });
    }
  });
  try {
    await admin.locator('#colour-0-swatch').fill('#be3737');
    await oldStarted;
    await expect(admin.getByRole('button', { name: 'Save Changes', exact: true })).toBeDisabled();
    await admin.locator('#colour-0-swatch').fill(blue);
    await expect(admin.locator('#colour-0-image')).toHaveValue(blueUrl);
    releaseOld();
    await oldFinished;
    await admin.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(admin.locator('#colour-0-image')).toHaveValue(blueUrl);
    await expect(admin.locator('#colour-0-swatch')).toHaveValue(blue);
    await expect(admin.getByRole('button', { name: 'Save Changes', exact: true })).toBeEnabled();
  } finally {
    releaseOld();
    await admin.unroute(pattern);
  }
}

async function main() {
  const initialFingerprint = await fingerprint(actualProductsFile);
  let server;
  let browser;
  let admin;
  let shop;
  let serverLog = '';
  let spawnError;
  let failure;
  const browserErrors = [];
  try {
    await fs.mkdir(dataDirectory, { recursive: true });
    await fs.writeFile(productsFile, '[]\n', { flag: 'wx' });
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--port', String(port)], {
      cwd: frontend,
      env: { ...process.env, DATABASE_URL: '', PRODUCT_DATA_DIR: dataDirectory, ADMIN_PASSWORD: password },
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.on('error', (error) => { spawnError = error; });
    server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
    server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });
    await waitForServer(origin, server, () => serverLog, () => spawnError);
    console.log(`Isolated auto-colour catalogue ready on port ${port}.`);

    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    context.setDefaultTimeout(20000);
    context.on('page', (page) => page.on('pageerror', (error) => browserErrors.push(error.message)));
    admin = await context.newPage();
    await admin.goto(`${origin}/admin/products`, { waitUntil: 'networkidle' });
    await admin.getByLabel('Admin password', { exact: true }).fill(password);
    await admin.getByRole('button', { name: 'Sign in to workspace' }).click();
    await expect(admin.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
    await admin.getByRole('button', { name: '+ New Product', exact: true }).click();
    await admin.locator('#product-title').fill(title);
    await admin.locator('#product-selling-price').fill('249');
    await admin.locator('#product-original-price').fill('839.99');
    await admin.locator('#product-category').selectOption('3-Seater');
    await admin.locator('#product-image').fill(source);
    await admin.getByRole('button', { name: '+ Add colour', exact: true }).click();
    await expect(colourFields(admin, 0).getByRole('radio', { name: 'Generate from main photo', exact: true })).toBeChecked();
    await expect(admin.locator('#colour-0-stock')).toHaveValue('1');
    await expect(admin.locator('#colour-0-price')).toHaveValue('');
    const blueUrl = await chooseGeneratedColour(admin, 0, blue);
    await expect(admin.locator('#colour-0-name')).toHaveValue('Blue');
    await expect(admin.getByText('Colour preview. Actual fabric may vary.', { exact: true })).toBeVisible();
    const created = await submitEditor(admin, 'POST', 'Create Product');
    assert.deepEqual(created.images, [source]);
    assert.deepEqual(created.variants[0].images, [blueUrl]);
    assert.equal(created.variants[0].stock, 1);
    assert.equal(Number(created.variants[0].price), 249);
    await verifyWebp(context, origin, blueUrl);
    console.log('PASS: one main photo creates a real WebP colour image and saved link without entering a colour-photo URL.');

    await admin.reload({ waitUntil: 'networkidle' });
    await admin.getByRole('row').filter({ hasText: title }).getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(colourFields(admin, 0).getByRole('radio', { name: 'Generate from main photo', exact: true })).toBeChecked();
    await expect(admin.locator('#colour-0-image')).toHaveValue(blueUrl);
    await expect(admin.getByRole('button', { name: 'Save Changes', exact: true })).toBeEnabled();
    await assertNoOverflow(admin, 'Automatic colour editor');
    await admin.screenshot({ path: path.join(artifacts, 'auto-colours-admin.png'), fullPage: true });

    shop = await context.newPage();
    await shop.goto(`${origin}/products`, { waitUntil: 'networkidle' });
    const card = shop.getByRole('article', { name: title, exact: true });
    const moreColours = card.getByRole('button', { name: `More colours for ${title}`, exact: true });
    if (await moreColours.count()) await moreColours.click();
    await card.getByRole('button', { name: 'Blue', exact: true }).click();
    await expectPhoto(card.locator('img'), blueUrl);
    await expect(card.getByText('Save £590.99', { exact: true })).toBeVisible();
    const productHref = await card.getByRole('link', { name: title, exact: true }).getAttribute('href');
    await card.screenshot({ path: path.join(artifacts, 'auto-colours-card.png') });
    await shop.goto(new URL(productHref, origin).href, { waitUntil: 'networkidle' });
    await expectPhoto(shop.locator(`img[src="${blueUrl}"]`).first(), blueUrl);
    await shop.getByRole('button', { name: /^Add to basket/ }).click();
    await expect.poll(() => shop.evaluate(() => JSON.parse(localStorage.getItem('cart') || '[]')[0]?.image)).toBe(blueUrl);
    await shop.goto(`${origin}/cart`, { waitUntil: 'networkidle' });
    await expectPhoto(shop.locator(`img[src="${blueUrl}"]`).first(), blueUrl);
    console.log('PASS: saved generation mode reopens correctly; card, detail and basket load the generated image.');

    const greenUrl = await chooseGeneratedColour(admin, 0, green);
    assert.notEqual(greenUrl, blueUrl);
    await admin.locator('#colour-0-name').fill('Olive green');
    const changed = await submitEditor(admin, 'PUT', 'Save Changes');
    assert.equal(changed.variants[0].id, created.variants[0].id);
    assert.deepEqual(changed.variants[0].images, [greenUrl]);
    await verifyWebp(context, origin, greenUrl);
    const cached = await context.request.post(`${origin}/api/sofa-previews/`, { data: { source, color: blue }, timeout: generationTimeout });
    assert.equal(cached.status(), 200, await cached.text());
    assert.equal((await cached.json()).url, blueUrl, 'The same source and colour must reuse the same image link.');
    await admin.getByRole('row').filter({ hasText: title }).getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(admin.locator('#colour-0-image')).toHaveValue(greenUrl);
    await verifyLatestColourWins(admin, blueUrl, greenUrl);
    await admin.getByRole('button', { name: 'Cancel', exact: true }).click();
    console.log('PASS: changing colour persists a different stable image link; an older delayed preview cannot replace the newest colour.');

    const legacyTitle = 'Legacy Main Photo Sofa';
    const stored = JSON.parse(await fs.readFile(productsFile, 'utf8'));
    stored.push({
      id: randomUUID(), slug: 'legacy-main-photo-sofa', title: legacyTitle,
      description: 'Isolated legacy-photo verification fixture.', category: '3-Seater',
      base_price: 349, compare_at_price: null, images: [source],
      variants: [{ id: randomUUID(), sku: 'LEGACY-TEST', color: 'Cream', color_hex: '#ece6d8', range_type: '3-Seater', price: 349, stock: 4, images: [] }],
    });
    await fs.writeFile(productsFile, JSON.stringify(stored, null, 2));
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.getByRole('row').filter({ hasText: legacyTitle }).getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(colourFields(admin, 0).getByRole('radio', { name: 'Use main photo', exact: true })).toBeChecked();
    await admin.getByRole('button', { name: '+ Add colour', exact: true }).click();
    await expect(admin.locator('#colour-1-stock')).toHaveValue('4');
    const legacyBlueUrl = await chooseGeneratedColour(admin, 1, blue);
    assert.equal(legacyBlueUrl, blueUrl);
    const legacySaved = await submitEditor(admin, 'PUT', 'Save Changes');
    assert.deepEqual(legacySaved.variants[0].images, [source]);
    assert.deepEqual(legacySaved.variants[1].images, [blueUrl]);
    await expect(admin.getByText('Product updated on the public website.', { exact: true })).toBeVisible();
    assert.deepEqual(browserErrors, []);
    console.log('PASS: a legacy colour uses its main photo while a newly added colour saves an automatic preview without the former Colour 1 photo error.');
  } catch (error) {
    failure = error;
    await Promise.allSettled([admin, shop].filter(Boolean).map((page, index) => page.screenshot({ path: path.join(artifacts, `auto-colours-failure-${index}.png`), fullPage: true })));
  } finally {
    await browser?.close();
    await stopServer(server);
    await fs.mkdir(artifacts, { recursive: true });
    await fs.writeFile(path.join(artifacts, `auto-colours-server-${runId}.log`), serverLog);
    if (await fingerprint(actualProductsFile) !== initialFingerprint) {
      const isolationError = new Error('The actual .local-data/products.json fingerprint changed during auto-colour verification.');
      failure = failure ? new AggregateError([failure, isolationError], 'Verification and catalogue isolation failed.') : isolationError;
    }
  }
  if (failure) throw failure;
  console.log('PASS: isolated server stopped; actual catalogue is unchanged.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
