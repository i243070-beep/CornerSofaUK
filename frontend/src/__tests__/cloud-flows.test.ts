// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { list, del } from '@vercel/blob';
import { NextRequest } from 'next/server';
import { EMPTY_BUILD } from '../lib/sofa-builder/types';
import { saveBuild, getBuild, serverPrice, configurationIdentity } from '../lib/sofa-builder/server';
import { listProducts } from '../lib/product-store';
import { GET as delivery } from '../app/api/delivery/quote/route';
import { POST as checkout } from '../app/api/orders/route';
import { getLocalOrders, updateLocalOrderStatus } from '../lib/local-orders';

const prefix = `verification/${randomUUID()}/`;
describe.skipIf(process.env.RUN_CLOUD_TESTS !== '1')('deployed storage flows with real private storage', () => {
  beforeAll(() => { vi.stubEnv('VERCEL', '1'); vi.stubEnv('SHOP_DATA_PREFIX', prefix); });
  afterAll(async () => {
    try {
      const result = await list({ token: process.env.BLOB_READ_WRITE_TOKEN, prefix });
      if (result.blobs.length) await del(result.blobs.map(blob => blob.url), { token: process.env.BLOB_READ_WRITE_TOKEN });
    } finally { vi.unstubAllEnvs(); }
  });
  it('prices delivery, saves a build, reloads it and checks it out into persistent orders', async () => {
    const response = await delivery(new NextRequest('http://localhost/api/delivery/quote/?postcode=SW1A%201AA'));
    expect(response.status).toBe(200); expect((await response.json()).delivery).toBe(0);
    const [product] = await listProducts(); const variant = product.variants[0];
    const selection = { ...EMPTY_BUILD, shape: product.category, productId: product.id, variantId: variant.id };
    expect((await serverPrice(selection, 'SW1A 1AA')).price.errors).toEqual([]);
    const build = await saveBuild(selection, 'SW1A 1AA');
    expect(await getBuild(build.id)).toEqual(build);
    const request = new NextRequest('http://localhost/api/orders/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      items: [{ productId: product.id, variantId: `build:${configurationIdentity(selection)}`, buildId: build.id, quantity: 1, price: build.price.merchandisePence / 100 }],
      customerDetails: { name: 'Storage verification', email: 'verification@example.com', phone: '07700900123', address: '10 Verification Street', city: 'London', postcode: 'SW1A 1AA' },
      checkoutKey: randomUUID(),
    }) });
    const orderResponse = await checkout(request); const payload = await orderResponse.json();
    expect(payload.error).toBeUndefined(); expect(orderResponse.status).toBe(201);
    expect((await getLocalOrders())[0].id).toBe(payload.order.id);
    await updateLocalOrderStatus(payload.order.id, 'confirmed');
    expect((await getLocalOrders())[0].status).toBe('confirmed');
  }, 120000);
});
