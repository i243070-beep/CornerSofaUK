import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Online payments are disabled. Please confirm your order at checkout and pay on delivery.', checkoutUrl: '/checkout' }, { status: 410 });
}
