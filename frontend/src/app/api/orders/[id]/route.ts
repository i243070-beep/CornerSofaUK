import { requireAdmin } from '@/lib/require-admin';
import { NextRequest, NextResponse } from 'next/server';
import { markLocalOrderEmailSent, updateLocalOrderDelivery, updateLocalOrderStatus, getLocalOrders, type LocalOrder } from '@/lib/local-orders';

function adminOrder(order: LocalOrder) {
  const { trackingToken, trackingTokenHash, checkoutKey, checkoutFingerprint, ...visible } = order;
  return visible;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json();
  const { status, deliveryDate, sofaDetails, sendEmail } = body;
  if (status !== undefined && !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (body.approve === true) {
    const date = typeof deliveryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) ? deliveryDate : '';
    const time = typeof body.deliveryTime === 'string' ? body.deliveryTime.trim().slice(0, 40) : '';
    if (!date || !time) return NextResponse.json({ error: 'Choose a delivery date and time before approving this order.' }, { status: 400 });
    const order = await updateLocalOrderDelivery(id, date, time, String(sofaDetails || '').slice(0, 2000), true);
    return order ? NextResponse.json({ success: true, order: adminOrder(order) }) : NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  let order = status === undefined ? (await getLocalOrders()).find((candidate) => candidate.id === id) : await updateLocalOrderStatus(id, status);
  if (deliveryDate !== undefined || sofaDetails !== undefined) {
    const current = (await getLocalOrders()).find(candidate => candidate.id === id);
    order = await updateLocalOrderDelivery(id, String(deliveryDate || current?.deliveryDate || ''), String(body.deliveryTime || current?.deliveryTime || ''), String(sofaDetails || current?.sofaDetails || ''));
  }
  if (sendEmail) {
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return NextResponse.json({ error: 'Order saved, but email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.' }, { status: 503 });
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [order.email], subject: `Your Corner Sofa delivery update — ${order.id}`, html: `<p>Hello ${order.customer},</p><p>Your Corner Sofa order <strong>${order.id}</strong> is being prepared.</p><p><strong>Delivery date:</strong> ${order.deliveryDate || 'To be confirmed'}<br><strong>Delivery time:</strong> ${order.deliveryTime || 'To be confirmed'}<br><strong>Sofa details:</strong> ${order.sofaDetails || 'See your order confirmation.'}</p><p>Thank you,<br>Corner Sofa</p>` }),
    });
    if (!emailResponse.ok) return NextResponse.json({ error: 'Order saved, but the delivery email could not be sent.' }, { status: 502 });
    order = await markLocalOrderEmailSent(id);
  }
  return order ? NextResponse.json({ success: true, order: adminOrder(order) }) : NextResponse.json({ error: 'Order not found' }, { status: 404 });
}
