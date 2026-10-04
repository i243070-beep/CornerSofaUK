import { OLD_SOFA_REMOVAL_COST, validDeliveryDate } from '@/lib/delivery-preferences';
import { requireAdmin } from '@/lib/require-admin';
import { NextRequest, NextResponse } from 'next/server';
import { createLocalOrder, getLocalOrders, OrderConflictError } from '@/lib/local-orders';
import { CheckoutValidationError, validateCheckoutItems } from '@/lib/checkout-products';
import { checkCustomerDetails } from '@/lib/checkout-details';
import { createHash, randomBytes } from 'node:crypto';
import { deliveryCharge } from '@/lib/alashi-commerce';
import { ASSEMBLY_FEE } from '@/lib/alashi-commerce';
import { records } from '@/lib/alashi-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const orders = (await getLocalOrders()).map(({ trackingToken, trackingTokenHash, checkoutKey, checkoutFingerprint, ...order }) => order);
  return NextResponse.json(orders, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { items, customerDetails, assemblyFloor = 'ground', checkoutKey, deliveryPreference = 'asap', requestedDeliveryDate = '', deliveryInstructions = '', removeOldSofa = false } = await request.json();
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'Basket is empty' }, { status: 400 });
    const { customer, errors, valid } = checkCustomerDetails(customerDetails);
    if (!valid) return NextResponse.json({ error: 'Please check your contact and delivery details.', errors }, { status: 400 });
    if (assemblyFloor !== 'ground' && assemblyFloor !== 'first') return NextResponse.json({ error: 'Choose ground-floor or first-floor assembly.' }, { status: 400 });
    if (checkoutKey !== undefined && (typeof checkoutKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(checkoutKey))) return NextResponse.json({ error: 'Invalid checkout reference.' }, { status: 400 });

    if (!['asap', 'date'].includes(deliveryPreference) || (deliveryPreference === 'date' && !validDeliveryDate(requestedDeliveryDate))) return NextResponse.json({ error: 'Choose a delivery date at least four days from today.' }, { status: 400 });
    if (typeof removeOldSofa !== 'boolean' || typeof deliveryInstructions !== 'string' || deliveryInstructions.length > 1000) return NextResponse.json({ error: 'Please check your delivery options and instructions.' }, { status: 400 });
    const preferences = { deliveryPreference, requestedDeliveryDate: deliveryPreference === 'date' ? requestedDeliveryDate : '', deliveryInstructions: deliveryInstructions.trim(), removeOldSofa, removalCost: removeOldSofa ? OLD_SOFA_REMOVAL_COST : 0 };
    const validatedItems = await validateCheckoutItems(items);
    const delivery = deliveryCharge(await records(), customer.postcode);
    if (delivery === undefined) return NextResponse.json({ error: 'Enter a valid UK postcode to check your delivery charge.' }, { status: 400 });
    const assemblyCost = assemblyFloor === 'first' ? ASSEMBLY_FEE : 0;
    const subtotalPennies = validatedItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    const total = (subtotalPennies + Math.round(delivery * 100) + Math.round(assemblyCost * 100) + preferences.removalCost * 100) / 100;
    const checkoutFingerprint = createHash('sha256').update(JSON.stringify({ customer, validatedItems, delivery, assemblyFloor, preferences })).digest('hex');
    const trackingToken = randomBytes(32).toString('hex');
    const order = await createLocalOrder({
      ...preferences,
      customer: customer.name,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      postcode: customer.postcode,
      phone: customer.phone,
      total,
      subtotal: subtotalPennies / 100,
      deliveryOption: delivery === 0 ? 'Standard UK delivery' : 'Additional area delivery',
      deliveryCost: delivery,
      assemblyFloor,
      assemblyCost,
      items: validatedItems.reduce((sum, item) => sum + item.quantity, 0),
      status: 'pending',
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'unpaid',
      trackingToken,
      trackingTokenHash: createHash('sha256').update(trackingToken).digest('hex'),
      checkoutKey,
      checkoutFingerprint,
      lines: validatedItems.map((item) => ({
        title: item.title, color: item.color, quantity: item.quantity, price: item.price, type: item.itemType || 'sofa',
        productId: item.productId, variantId: item.variantId, range_type: item.range_type, image: item.image,
        ...(item.buildSnapshot ? { buildSnapshot: item.buildSnapshot } : {}),
      })),
    });
    const { checkoutKey: privateKey, checkoutFingerprint: privateFingerprint, trackingTokenHash: privateTrackingHash, ...receipt } = order;
    return NextResponse.json({ success: true, order: receipt }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid checkout information.' }, { status: 400 });
    if (error instanceof CheckoutValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not save order' }, { status: 500 });
  }
}
