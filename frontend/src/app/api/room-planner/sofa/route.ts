import { NextRequest, NextResponse } from 'next/server';
import { findProduct } from '@/lib/product-store';
import { getColourHex } from '@/lib/product-options';
import { isSofaPreviewUrl } from '@/lib/sofa-preview';
import { generateSofaCutout } from '@/lib/sofa-preview-renderer';
import { originalProductImage } from '@/lib/product-room-images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('product');
  const variantId = request.nextUrl.searchParams.get('variant');
  if (!productId || !variantId || productId.length > 100 || variantId.length > 100) return NextResponse.json({ error: 'Choose a sofa and colour.' }, { status: 400 });
  try {
    const product = await findProduct(productId);
    const variant = product?.variants.find(v => v.id === variantId);
    if (!product || !variant) return NextResponse.json({ error: 'This sofa or colour is no longer available.' }, { status: 404 });
    const variantPhoto = variant.images?.[0] && originalProductImage(variant.images[0]);
    const source = variantPhoto && !isSofaPreviewUrl(variantPhoto) ? variantPhoto : product.images?.[0] && originalProductImage(product.images[0]);
    if (!source || isSofaPreviewUrl(source)) return NextResponse.json({ error: 'This sofa needs an original catalogue photo for room previews.' }, { status: 422 });
    const png = await generateSofaCutout(source, isSofaPreviewUrl(variantPhoto || '') ? getColourHex(variant) : undefined);
    return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    console.error('Room sofa preview:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'We could not prepare this sofa photo. Retry, or choose another sofa. The floor plan is still available.' }, { status: 503 });
  }
}
