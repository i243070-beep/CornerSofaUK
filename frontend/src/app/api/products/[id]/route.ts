import { requireAdmin } from '@/lib/require-admin';
import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, sql } from '@/lib/db';
import { deleteLocalProduct } from '@/lib/local-products';
import { findProduct, saveProduct } from '@/lib/product-store';
import { ProductValidationError } from '@/lib/product-validation';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await findProduct(id);
    return product
      ? NextResponse.json(product, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
      : NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const product = await saveProduct(await request.json(), id);
    return product ? NextResponse.json({ success: true, product })
      : NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid product details.' }, { status: 400 });
    if (error instanceof ProductValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Could not save product. If using PostgreSQL, check that the product colours migration has been applied.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const deleted = !isDatabaseConfigured ? await deleteLocalProduct(id)
      : (await sql`DELETE FROM products WHERE id=${id} RETURNING id, title`)[0];
    return deleted ? NextResponse.json({ success: true, deleted })
      : NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
