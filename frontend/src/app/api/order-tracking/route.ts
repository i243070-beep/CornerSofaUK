import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getLocalOrders } from '@/lib/local-orders';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokens = Array.isArray(body?.tokens) ? body.tokens.slice(0, 30) : [];
    if (!tokens.every((token: unknown) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token))) {
      return NextResponse.json({ error: 'Invalid saved order access.' }, { status: 400 });
    }
    const hashes = new Set(tokens.map((token: string) => createHash('sha256').update(token).digest('hex')));
    const orders = (await getLocalOrders()).filter(order => order.trackingTokenHash && hashes.has(order.trackingTokenHash));
    return NextResponse.json({ orders: orders.map(({ trackingToken, trackingTokenHash, checkoutKey, checkoutFingerprint, ...order }) => order) }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    return NextResponse.json({ error: 'Could not load your orders. Please try again.' }, { status: 400 });
  }
}
