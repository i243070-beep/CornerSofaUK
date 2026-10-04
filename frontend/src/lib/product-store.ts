import { randomUUID } from 'crypto';
import type { neon } from '@neondatabase/serverless';
import { isDatabaseConfigured, sql } from './db';
import { createLocalProduct, getLocalProduct, getLocalProducts, updateLocalProduct } from './local-products';
import { ensureLocalProductImages } from './product-images';
import { applyProductRoomImages } from './product-room-images';
import { validateProductInput } from './product-validation';
import type { StoreProduct } from './product-options';

function normaliseProduct(product: StoreProduct): StoreProduct {
  return applyProductRoomImages(ensureLocalProductImages({ ...product, status: 'published', review_flags: [], stock_confirmation_required: false,
    base_price: Number(product.base_price),
    compare_at_price: product.compare_at_price == null ? null : Number(product.compare_at_price),
    variants: (product.variants || []).filter((variant) => variant?.id).map((variant) => ({
      ...variant, price: Number(variant.price), stock: 1000, images: variant.images || [],
    })),
  }));
}

export async function listProducts({ includeDrafts = false }: { includeDrafts?: boolean } = {}): Promise<StoreProduct[]> {
  if (!isDatabaseConfigured) return (await getLocalProducts()).map(normaliseProduct);
  // JSON extraction keeps reads compatible with databases awaiting the additive migration.
  const products = await sql`
    SELECT p.*, (to_jsonb(p)->>'compare_at_price')::numeric AS compare_at_price,
      COALESCE(json_agg(to_jsonb(pv) ORDER BY pv.price, pv.id)
        FILTER (WHERE pv.id IS NOT NULL), '[]') AS variants
    FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id
    GROUP BY p.id ORDER BY p.created_at DESC
  `;
  return products.map((product) => normaliseProduct(product as StoreProduct));
}

export async function findProduct(id: string, { includeDrafts = false }: { includeDrafts?: boolean } = {}): Promise<StoreProduct | undefined> {
  if (!isDatabaseConfigured) {
    const product = await getLocalProduct(id);
    return product ? normaliseProduct(product) : undefined;
  }
  const products = await sql`
    SELECT p.*, (to_jsonb(p)->>'compare_at_price')::numeric AS compare_at_price,
      COALESCE(json_agg(to_jsonb(pv) ORDER BY pv.price, pv.id)
        FILTER (WHERE pv.id IS NOT NULL), '[]') AS variants
    FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.id = ${id} GROUP BY p.id
  `;
  return products[0] ? normaliseProduct(products[0] as StoreProduct) : undefined;
}

export async function saveProduct(input: unknown, id?: string): Promise<StoreProduct | undefined> {
  const existing = id ? await findProduct(id, { includeDrafts: true }) : undefined;
  if (id && !existing) return undefined;
  const data = validateProductInput(input, existing);
  const slug = existing?.slug || `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${randomUUID().slice(0, 8)}`;
  if (!isDatabaseConfigured) {
    const saved = id ? await updateLocalProduct(id, data) : await createLocalProduct({ ...data, slug });
    return saved ? normaliseProduct(saved) : undefined;
  }

  const productId = id || randomUUID();
  const db = sql as ReturnType<typeof neon>;
  // Save product pricing and its exact set of colours atomically, preserving existing IDs/SKUs.
  const productQuery = id ? db`
    UPDATE products SET title=${data.title}, description=${data.description},
      base_price=${data.base_price}, compare_at_price=${data.compare_at_price},
      category=${data.category}, images=${data.images}
    WHERE id=${productId} RETURNING id
  ` : db`
    INSERT INTO products (id, slug, title, description, base_price, compare_at_price, category, images)
    VALUES (${productId}, ${slug}, ${data.title}, ${data.description}, ${data.base_price},
      ${data.compare_at_price}, ${data.category}, ${data.images}) RETURNING id
  `;
  const variantJson = JSON.stringify(data.variants);
  await db.transaction([
    productQuery,
    db`UPDATE products SET status=${data.status || 'published'}, categories=${data.categories || [data.category]},
      review_flags=${data.review_flags || []}, stock_confirmation_required=${data.stock_confirmation_required || false}
      WHERE id=${productId}`,
    ...(data.dimensions_cm || existing?.dimensions_cm ? [db`UPDATE products SET dimensions_cm=${JSON.stringify(data.dimensions_cm)}::jsonb WHERE id=${productId}`] : []),
    db`DELETE FROM product_variants WHERE product_id=${productId}
      AND id NOT IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(${variantJson}::jsonb))`,
    db`INSERT INTO product_variants (id, product_id, range_type, sku, price, color, color_hex, stock, images)
      SELECT v.id, ${productId}::uuid, v.range_type, v.sku, v.price, v.color, v.color_hex, v.stock,
        ARRAY(SELECT jsonb_array_elements_text(v.images))
      FROM jsonb_to_recordset(${variantJson}::jsonb)
        AS v(id uuid, range_type text, sku text, price numeric, color text, color_hex text, stock integer, images jsonb)
      ON CONFLICT (id) DO UPDATE SET range_type=EXCLUDED.range_type, price=EXCLUDED.price,
        color=EXCLUDED.color, color_hex=EXCLUDED.color_hex, stock=EXCLUDED.stock, images=EXCLUDED.images
      WHERE product_variants.product_id=${productId}`,
  ]);
  return findProduct(productId, { includeDrafts: true });
}
