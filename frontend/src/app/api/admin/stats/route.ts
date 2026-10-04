import { requireAdmin } from '@/lib/require-admin';
import { NextResponse } from 'next/server';
import { isDatabaseConfigured, sql } from '@/lib/db';
import { getLocalProducts } from '@/lib/local-products';
import { getLocalOrders } from '@/lib/local-orders';
import { readLocalSwatchRequests } from '@/lib/swatch-request-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (!isDatabaseConfigured) {
      const [products, orders, legacySwatches] = await Promise.all([getLocalProducts(), getLocalOrders(), readLocalSwatchRequests()]);
      return NextResponse.json({
        products: products.length,
        swatchRequests: legacySwatches.length + orders.filter((order) => order.lines.some((line) => line.type === 'swatch')).length,
        appointments: 0,
        orders: orders.length,
        pendingAppointments: 0,
        pendingSwatches: 0,
      }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }

    const [products, swatchRequests, appointments] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM products`,
      sql`SELECT COUNT(*) as count FROM swatch_requests`,
      sql`SELECT COUNT(*) as count FROM appointments`,
    ]);

    const [pendingAppointments, pendingSwatches] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'`,
      sql`SELECT COUNT(*) as count FROM swatch_requests WHERE status = 'pending'`,
    ]);

    return NextResponse.json({
      products: parseInt(products[0]?.count || '0'),
      swatchRequests: parseInt(swatchRequests[0]?.count || '0'),
      appointments: parseInt(appointments[0]?.count || '0'),
      orders: 0,
      pendingAppointments: parseInt(pendingAppointments[0]?.count || '0'),
      pendingSwatches: parseInt(pendingSwatches[0]?.count || '0'),
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    const [products, orders, legacySwatches] = await Promise.all([getLocalProducts(), getLocalOrders(), readLocalSwatchRequests()]);
    return NextResponse.json({
      products: products.length,
      swatchRequests: legacySwatches.length + orders.filter((order) => order.lines.some((line) => line.type === 'swatch')).length,
      appointments: 0,
      orders: orders.length,
      pendingAppointments: 0,
      pendingSwatches: 0,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
