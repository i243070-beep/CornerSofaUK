import { NextRequest, NextResponse } from 'next/server';
import { normalizeUkPostcode } from '@/lib/checkout-details';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const postcode = typeof body?.postcode === 'string' ? body.postcode : '';
    const city = typeof body?.city === 'string' ? body.city.trim() : '';
    const normalized = normalizeUkPostcode(postcode);
    if (!normalized) return NextResponse.json({ valid: false, message: 'Please enter a valid UK postcode format.' }, { status: 400 });
    if (city.length < 2 || city.length > 100) return NextResponse.json({ valid: false, field: 'city', message: 'Enter your town or city.' }, { status: 400 });
    return NextResponse.json({ valid: true, postcode: normalized, townOrCity: city, verification: 'format-only' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ valid: false, message: 'Please check your postcode and town or city.' }, { status: 400 });
  }
}
