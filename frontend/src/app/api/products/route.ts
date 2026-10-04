import { requireAdmin } from '@/lib/require-admin';
import { NextRequest, NextResponse } from 'next/server';
import { listProducts, saveProduct } from '@/lib/product-store';
import { ProductValidationError } from '@/lib/product-validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const includeDrafts = request.nextUrl.searchParams.get('includeDrafts') === '1';
  if (includeDrafts) {
    const denied = await requireAdmin();
    if (denied) return denied;
  }
  try {
    return NextResponse.json(await listProducts({ includeDrafts }), { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const product = await saveProduct(await request.json());
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error instanceof SyntaxError ? 'Invalid product details.' : error.message }, { status: 400 });
    }
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Could not save product. If using PostgreSQL, check that the product colours and catalogue visibility migrations have been applied.' }, { status: 500 });
  }
}
