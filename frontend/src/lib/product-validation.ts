import { randomUUID } from 'crypto';
import type { StoreProduct, ProductVariant } from './product-options';
import { sofaImageForCategory } from './product-images';

export class ProductValidationError extends Error {}

function fail(message: string): never { throw new ProductValidationError(message); }

function amount(value: unknown, label: string) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    return fail(`${label} is required.`);
  }
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0 || result > 99999999.99) {
    return fail(`${label} must be a positive price.`);
  }
  if (Math.abs(result * 100 - Math.round(result * 100)) > 0.00001) {
    return fail(`${label} must have no more than two decimal places.`);
  }
  return Math.round(result * 100) / 100;
}

export function validProductImage(value: string) {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

function imageList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 12) return fail(`${label} must contain up to 12 image URLs.`);
  return value.map((image) => {
    if (typeof image !== 'string' || !image.trim() || image.length > 4000 || !validProductImage(image.trim())) {
      return fail(`${label}: use an http(s) URL or a local image path starting with /.`);
    }
    return image.trim();
  });
}

export function validateProductInput(input: unknown, existing?: StoreProduct): Omit<StoreProduct, 'id' | 'slug'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('Product details are required.');
  const body = input as Record<string, unknown>;
  const status = 'published';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) return fail('Enter a product title of up to 200 characters.');
  const base_price = amount(body.base_price, 'Selling price');
  const category = typeof body.category === 'string' ? body.category.trim() : existing?.category || '';
  if (category.length > 100) return fail('Category is too long.');
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length > 20000) return fail('Description is too long.');
  const images = body.images === undefined ? existing?.images || [sofaImageForCategory(category)] : imageList(body.images, 'Product photos');
  const original = body.compare_at_price === undefined ? existing?.compare_at_price : body.compare_at_price;
  const compare_at_price = original === null || original === undefined || original === '' ? null : amount(original, 'Original price');
  let dimensions_cm = existing?.dimensions_cm || null;
  if (body.dimensions_cm !== undefined) {
    if (body.dimensions_cm === null) dimensions_cm = null;
    else {
      const dims = body.dimensions_cm as Record<string, unknown>;
      if (!dims || typeof dims !== 'object' || Array.isArray(dims)
        || !['width', 'depth', 'height'].every(key => typeof dims[key] === 'number' && Number.isFinite(dims[key]) && Number(dims[key]) >= 20 && Number(dims[key]) <= 1000)) {
        return fail('Enter sofa width, depth and height in centimetres (20–1000), or leave all three blank.');
      }
      dimensions_cm = { width: Number(dims.width), depth: Number(dims.depth), height: Number(dims.height) };
    }
  }

  let variants: ProductVariant[];
  if (body.variants === undefined) {
    variants = (existing?.variants || []).map((variant) => ({ ...variant, stock: 1000,
      price: Number(variant.price) === Number(existing?.base_price) ? base_price : Number(variant.price),
    }));
  } else {
    if (!Array.isArray(body.variants) || body.variants.length > 50) return fail('A product can have up to 50 colour options.');
    const entries = body.variants;
    const ids = new Set<string>();
    const colours = new Set<string>();
    variants = entries.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return fail('Invalid colour option.');
      const label = `Colour ${index + 1}`;
      const color = typeof entry.color === 'string' ? entry.color.trim() : '';
      const range_type = typeof entry.range_type === 'string' && entry.range_type.trim() ? entry.range_type.trim() : category;
      if (!color || color.length > 100) return fail(`${label}: enter a colour name of up to 100 characters.`);
      if (!range_type || range_type.length > 100) return fail(`${label}: select a sofa configuration.`);
      const colourKey = `${color.toLowerCase()}|${range_type.toLowerCase()}`;
      if (colours.has(colourKey)) return fail(`${color} is already added for this configuration.`);
      colours.add(colourKey);
      const previous = existing?.variants.find((variant) => variant.id === entry.id);
      if (entry.id && !previous) return fail(`${label}: this option does not belong to this product.`);
      const id = previous?.id || randomUUID();
      if (ids.has(id)) return fail('Duplicate colour option ID.');
      ids.add(id);
      const color_hex = entry.color_hex === undefined ? previous?.color_hex || null : entry.color_hex;
      if (color_hex !== null && (typeof color_hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(color_hex))) {
        return fail(`${color}: enter a valid six-digit colour code.`);
      }
      const price = amount(entry.price === undefined ? base_price : entry.price, `${color} selling price`);
      const stock = 1000;
      const variantImages = imageList(entry.images ?? previous?.images ?? [], `${color} photos`);
      if (!variantImages.length && !previous) {
        return fail(`${color}: add a photo showing this sofa in this colour.`);
      }
      return { id, range_type, color, color_hex, price, stock, images: variantImages,
        sku: previous?.sku || `SOFA-${id}`,
        ...(previous?.source_variant_id != null ? { source_variant_id: previous.source_variant_id } : {}),
      };
    });
  }
  if (compare_at_price !== null && compare_at_price <= Math.max(base_price, ...variants.map((variant) => Number(variant.price)))) {
    return fail('Original price must be higher than the selling price of every colour. Leave it blank for no discount.');
  }
  const categories = [...new Set([category, ...(existing?.categories || []).filter(value => value !== existing?.category)])];
  return { title, description, base_price, compare_at_price, category, categories, dimensions_cm, status,
    review_flags: [],
    stock_confirmation_required: false,
    images: images.length ? images : [sofaImageForCategory(category)], variants,
  };
}
