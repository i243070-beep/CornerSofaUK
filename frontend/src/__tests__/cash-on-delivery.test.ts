// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';

const customer = { name: 'Checkout Test', email: 'checkout@example.com', phone: '07700900123', address: '10 Test Street', city: 'London', postcode: 'sw1a1aa' };
const item = { productId: 'sofa', variantId: 'grey', quantity: 2, price: 499, title: 'Forged title', color: 'Wrong colour' };
vi.mock('@/lib/product-store', () => ({ findProduct: async () => ({ id: 'sofa', title: 'Salone 2 Seater', images: ['/sofa.webp'], variants: [{ id: 'grey', color: 'Grey', range_type: '2-Seater', price: 499, images: ['/grey.webp'] }] }) }));
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => undefined }));

let directory: string;
let route: typeof import('@/app/api/orders/route');
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'sofa-cod-check-'));
  vi.resetModules();
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(directory);
  try { route = await import('@/app/api/orders/route'); } finally { cwd.mockRestore(); }
});
afterEach(async () => {
  await rm(path.join(directory, '.local-data', 'orders.json'), { force: true });
  await rmdir(path.join(directory, '.local-data')).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await rmdir(directory);
});
const request = (extra = {}) => new NextRequest('http://localhost/api/orders', { method: 'POST', body: JSON.stringify({ items: [item], customerDetails: customer, deliveryOption: 'express', ...extra }) });

describe('Cash-on-delivery checkout and admin persistence', () => {
  it('stores correct customer, delivery and catalogue details for admin with nothing paid', async () => {
    const response = await route.POST(request({ deliveryCost: -1000, paymentMethod: 'stripe', assemblyFloor: 'first' }));
    expect(response.status).toBe(201);
    const { order } = await response.json();
    expect(order).toMatchObject({ id: expect.stringMatching(/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{6}$/), trackingToken: expect.stringMatching(/^[a-f0-9]{64}$/), assemblyFloor: 'first', assemblyCost: 20, customer: customer.name, email: customer.email, phone: customer.phone, address: customer.address, city: 'London', postcode: 'SW1A 1AA', paymentMethod: 'Cash on Delivery', paymentStatus: 'unpaid', status: 'pending', subtotal: 998, deliveryCost: 0, total: 1018, items: 2 });
    expect(order.lines[0]).toMatchObject({ productId: 'sofa', variantId: 'grey', title: 'Salone 2 Seater', color: 'Grey', range_type: '2-Seater', quantity: 2, price: 499 });
    const adminOrders = await (await route.GET()).json();
    expect(adminOrders).toHaveLength(1);
    expect(adminOrders[0]).toMatchObject({ id: order.id, customer: order.customer });
    expect(adminOrders[0].trackingToken).toBeUndefined();
    expect(adminOrders[0].trackingTokenHash).toBeUndefined();
    expect(order.checkoutFingerprint).toBeUndefined();
  });
  it.each(['name', 'email', 'phone', 'address', 'city', 'postcode'])('rejects missing %s before saving', async field => {
    const response = await route.POST(request({ customerDetails: { ...customer, [field]: '' } }));
    expect(response.status).toBe(400);
    expect((await response.json()).errors[field]).toBeTruthy();
    expect(await (await route.GET()).json()).toEqual([]);
  });
  it('rejects bad contact and postcode formats', async () => {
    const response = await route.POST(request({ customerDetails: { ...customer, email: 'invalid', phone: '12', postcode: 'invalid' } }));
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).errors)).toEqual(expect.arrayContaining(['email', 'phone', 'postcode']));
  });
  it('rejects stale sofa prices and invalid delivery options', async () => {
    expect((await route.POST(request({ items: [{ ...item, price: 1 }] }))).status).toBe(400);
    expect((await route.POST(request({ assemblyFloor: 'made-up' }))).status).toBe(400);
    expect(await (await route.GET()).json()).toEqual([]);
  });
  it('saves concurrent orders without losing any', async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => route.POST(request())));
    expect(responses.every(response => response.status === 201)).toBe(true);
    const orders = await (await route.GET()).json();
    expect(orders).toHaveLength(6);
    expect(new Set(orders.map((order: { id: string }) => order.id)).size).toBe(6);
  });
  it('reuses the saved order for a retry and rejects changed details under that reference', async () => {
    const checkoutKey = '087ac082-7696-4d7b-8008-ebfc945c6284';
    const first = await (await route.POST(request({ checkoutKey }))).json();
    const retry = await (await route.POST(request({ checkoutKey }))).json();
    expect(retry.order.id).toBe(first.order.id);
    expect(retry.order.trackingToken).toBe(first.order.trackingToken);
    expect(await (await route.GET()).json()).toHaveLength(1);
    expect((await route.POST(request({ checkoutKey, customerDetails: { ...customer, address: '20 Another Street' } }))).status).toBe(409);
  });

  it('shows orders only through their unguessable saved customer token', async () => {
    const created = await (await route.POST(request())).json();
    const tracking = await import('@/app/api/order-tracking/route');
    const get = (tokens: string[]) => tracking.POST(new NextRequest('http://localhost/api/order-tracking', { method: 'POST', body: JSON.stringify({ tokens }) }));
    expect((await get([created.order.trackingToken])).status).toBe(200);
    const result = await (await get([created.order.trackingToken])).json();
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]).toMatchObject({ id: created.order.id, total: created.order.total });
    expect(result.orders[0].trackingToken).toBeUndefined();
    expect((await get([created.order.id])).status).toBe(400);
  });
});
