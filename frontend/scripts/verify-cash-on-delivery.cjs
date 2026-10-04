const { chromium, expect } = require('@playwright/test');
const { loadEnvConfig } = require('@next/env');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const base = process.env.SOFA_VERIFY_BASE_URL || 'http://localhost:3000';
const output = path.join(root, 'artifacts/cash-on-delivery');
const marker = `COD CHECK ${randomUUID().slice(0, 8)}`;
const customer = { name: marker, email: 'cod-check@example.invalid', phone: '07700900123', address: '10 Test Street', city: 'London', postcode: 'DT1 1AA' };

async function main() {
  loadEnvConfig(root);
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let createdId;
  try {
    const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const login = await admin.request.post(`${base}/api/admin/auth/`, { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
    assert.equal(login.status(), 200, 'Admin authentication must succeed before the order check');
    const shopper = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    assert.equal((await shopper.request.get(`${base}/api/orders/`)).status(), 401, 'Customers cannot read the admin order list');
    const products = await (await shopper.request.get(`${base}/api/products/`)).json();
    const product = products.find(item => item.title === 'Salone 2 Seater');
    assert.ok(product);
    const page = await shopper.newPage();
    const payments = [];
    const errors = [];
    page.on('request', request => { if (/\/api\/(checkout|klarna)\/?$|stripe\.com|klarna\.com/.test(request.url())) payments.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${base}/product/${product.id}/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Add to basket/ }).click();
    await page.getByRole('button', { name: /Open basket/ }).click();
    await page.getByRole('link', { name: /Order.*pay on delivery/ }).click();
    await page.waitForURL(/\/checkout\/?$/);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Postcode character 1').fill('DT11AA');
    await page.getByRole('button', { name: 'Check delivery' }).click();
    await expect(page.getByText(/Area delivery/)).toBeVisible();
    await expect(page.getByText('£50.00', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Choose my floor and delivery details' }).click();
    await page.getByRole('radio', { name: /First floor/ }).check();
    for (const [key, value] of Object.entries(customer)) {
      if (key !== 'postcode') await page.locator(`#checkout-${key}`).fill(value);
    }
    await page.screenshot({ path: path.join(output, 'checkout-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'checkout-mobile.png'), fullPage: true });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    assert.ok(dimensions.width <= dimensions.viewport + 1, JSON.stringify(dimensions));
    await page.getByRole('button', { name: 'Review my order' }).click();
    await expect(page.getByText(/Area delivery/)).toBeVisible();
    await expect(page.getByText('First-floor assembly · £20')).toBeVisible();
    const responsePromise = page.waitForResponse(response => response.url().includes('/api/orders') && response.request().method() === 'POST' && ![307, 308].includes(response.status()));
    await page.getByRole('button', { name: /Confirm order.*pay on delivery/ }).click();
    const response = await responsePromise;
    const result = await response.json();
    assert.equal(response.status(), 201, result.error);
    createdId = result.order.id;
    assert.match(createdId, /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{6}$/);
    assert.match(result.order.trackingToken, /^[a-f0-9]{64}$/);
    assert.equal(result.order.customer, marker);
    assert.equal(result.order.deliveryCost, 50);
    assert.equal(result.order.assemblyFloor, 'first');
    assert.equal(result.order.assemblyCost, 20);
    assert.equal(result.order.total, result.order.subtotal + 70);
    await page.waitForURL(/\/checkout\/success\/?\?order_id=/);
    await expect(page.getByRole('heading', { name: 'Your order is with us.', exact: true })).toBeVisible();
    await expect(page.locator(`[aria-label="Order number ${createdId}"]`)).toBeVisible();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('cart'))), []);
    assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('corner-sofa-customer-orders')))).some(order => order.id === createdId));

    await page.goto(`${base}/my-orders/`, { waitUntil: 'networkidle' });
    await expect(page.locator(`[aria-label="Order number ${createdId}"]`)).toBeVisible();
    await expect(page.getByText(/delivery date will appear here once the delivery team approves/i)).toBeVisible();
    assert.equal(await page.locator('input').count(), 0, 'Customers should not need to enter an order reference or postcode');
    await page.screenshot({ path: path.join(output, 'customer-order-pending.png'), fullPage: true });

    const orders = await (await admin.request.get(`${base}/api/orders/`)).json();
    const saved = orders.find(order => order.id === createdId);
    assert.ok(saved);
    for (const field of ['email', 'phone', 'address', 'city', 'postcode']) assert.equal(saved[field], customer[field]);
    assert.equal(saved.paymentMethod, 'Cash on Delivery');
    assert.equal(saved.paymentStatus, 'unpaid');
    assert.equal(saved.status, 'pending');
    assert.equal(saved.trackingToken, undefined);
    assert.equal(saved.trackingTokenHash, undefined);
    assert.equal(saved.lines[0].variantId, result.order.lines[0].variantId);

    const dashboard = await admin.newPage();
    await dashboard.goto(`${base}/admin/orders/`, { waitUntil: 'networkidle' });
    const row = dashboard.locator('tr').filter({ hasText: createdId });
    await expect(row).toBeVisible();
    const details = row.locator('xpath=following-sibling::tr[1]');
    await details.getByText('View sofas & delivery address', { exact: true }).click();
    await expect(details).toContainText(customer.address);
    await expect(details).toContainText(customer.postcode);
    await expect(details).toContainText(product.title);
    await expect(details).toContainText(result.order.lines[0].color);
    await expect(details).toContainText('First floor');
    await row.getByRole('button', { name: 'Approve & schedule' }).click();
    await dashboard.getByLabel('Delivery date').fill('2026-11-11');
    await dashboard.getByLabel('Delivery time').fill('10:00–14:00');
    await dashboard.getByRole('button', { name: 'Approve & publish date' }).click();
    await expect(row.locator('select')).toHaveValue('confirmed');
    assert.equal((await (await admin.request.get(`${base}/api/orders/`)).json()).find(order => order.id === createdId).status, 'confirmed');
    await dashboard.screenshot({ path: path.join(output, 'admin-order.png'), fullPage: true });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(/11 November 2026/)).toBeVisible();
    await expect(page.getByText('10:00–14:00', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'customer-order-approved.png'), fullPage: true });

    assert.deepEqual(payments, []);
    assert.deepEqual(errors, []);
    for (const endpoint of ['checkout', 'klarna']) assert.equal((await shopper.request.post(`${base}/api/${endpoint}/`, { data: {} })).status(), 410);
    await page.setViewportSize({ width: 1876, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.reference-hero-nav').screenshot({ path: path.join(output, 'header.png') });
    await expect(page.getByRole('link', { name: 'My orders' })).toBeVisible();
    console.log('PASS: postcode zones and free-floor rates; unique mixed six-character order ID; COD checkout; no postcode or ID lookup for customer; private order tokens; admin-only date/time approval appears automatically to customer; mobile layout; no online payment request.');
  } finally {
    await browser.close();
    // Remove only the synthetic order created by this run; preserve all customer orders.
    const file = path.join(root, '.local-data/orders.json');
    const current = JSON.parse(await fs.readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return '[]'; throw error; }));
    const candidate = current.find(order => createdId ? order.id === createdId : order.customer === marker && order.email === customer.email);
    if (candidate) {
      if (candidate.customer !== marker || candidate.email !== customer.email) throw new Error('Test order cleanup identity did not match');
      const temporary = `${file}.cod-check-${randomUUID()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(current.filter(order => order.id !== candidate.id), null, 2));
      await fs.rename(temporary, file);
      console.log('Removed the synthetic checkout order after verification.');
    } else if (createdId) throw new Error('The synthetic checkout order was not found during cleanup.');
  }
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
