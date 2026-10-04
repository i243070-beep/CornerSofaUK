import { NextRequest, NextResponse } from 'next/server';
import { deliveryCharge, normalizePostcode } from '@/lib/alashi-commerce';
import { records } from '@/lib/alashi-store';
import { normalizeUkPostcode } from '@/lib/checkout-details';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get('postcode') || '';
  const normalized = normalizeUkPostcode(postcode);
  if (!normalized) return NextResponse.json({ error: 'Enter a valid UK postcode, for example SW1A 1AA.' }, { status: 400 });

  const charge = deliveryCharge(await records(), normalized);
  if (charge === undefined) return NextResponse.json({ error: 'We could not calculate delivery for that postcode.' }, { status: 400 });
  const compact = normalizePostcode(normalized);
  const outward = compact.slice(0, -3);
  return NextResponse.json({ postcode: normalized, delivery: charge, outward }, { headers: { 'Cache-Control': 'no-store' } });
}
