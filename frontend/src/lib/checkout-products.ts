import { findProduct } from './product-store';
import { getVariantImages, type StoreProduct } from './product-options';
import { validOffer } from './alashi-commerce';
import { records } from './alashi-store';
import { configurationIdentity, getBuild, serverPrice } from './sofa-builder/server';
import type { BuildSnapshot } from './sofa-builder/types';

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

export interface ValidatedCheckoutItem {
  productId: string;
  variantId: string;
  title: string;
  color: string;
  range_type: string;
  price: number;
  quantity: number;
  image: string;
  itemType?: 'sofa' | 'swatch';
  buildSnapshot?: BuildSnapshot;
}

function fail(message: string): never {
  throw new CheckoutValidationError(message);
}

function pennies(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  const rounded = Math.round(value * 100);
  if (!Number.isSafeInteger(rounded) || Math.abs(value * 100 - rounded) > 0.00001) return undefined;
  return rounded;
}

/** Resolve every basket line against the same catalogue used by the admin and storefront. */
export async function validateCheckoutItems(input: unknown): Promise<ValidatedCheckoutItem[]> {
  if (!Array.isArray(input) || input.length === 0) return fail('Your basket is empty.');

  const products = new Map<string, Promise<StoreProduct | undefined>>();
  const validated = new Map<string, ValidatedCheckoutItem>();
  let hasSofa = false;

  for (const candidate of input) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return fail('An item in your basket is invalid. Please refresh your basket and try again.');
    }
    const item = candidate as Record<string, unknown>;
    if (typeof item.productId !== 'string' || !item.productId.trim()
      || typeof item.variantId !== 'string' || !item.variantId.trim()) {
      return fail('A product or colour is missing. Please refresh your basket and choose the colour again.');
    }
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      return fail('Choose a whole-number quantity between 1 and 10 for each sofa in your basket.');
    }

    const productId = item.productId;
    const variantId = item.variantId;
    if (item.itemType === 'swatch') return fail('Fabric is a sofa choice. Remove the old separate swatch and choose your fabric through the sofa builder.');
    hasSofa = true;
    if (item.buildId || variantId.startsWith('build:')) {
      if (typeof item.buildId !== 'string') return fail('Your custom sofa reference is missing. Reopen the builder.');
      const build = await getBuild(item.buildId);
      if (!build || !['fixed','estimate'].includes(build.price.status) || productId !== build.selection.productId || variantId !== `build:${configurationIdentity(build.selection)}`) return fail('This configuration needs a quotation or a new price check. Reopen the builder.');
      const fresh = await serverPrice(build.selection);
      if (fresh.price.errors.length || fresh.price.status === 'quote_required' || fresh.price.merchandisePence !== build.price.merchandisePence || fresh.price.specification.join('\n') !== build.price.specification.join('\n') || pennies(item.price) !== fresh.price.merchandisePence) return fail('The custom sofa price or specification changed. Edit your build and review it before checkout.');
      const key = JSON.stringify([productId, variantId]);
      const quantity = (validated.get(key)?.quantity || 0) + item.quantity;
      if (quantity > 10) return fail('You can order up to 10 of each custom configuration.');
      validated.set(key, { productId, variantId, title: build.price.title, color: fresh.price.specification.find(line => line.startsWith('Fabric / colour:')) || 'Selected finish', range_type: 'Personalised sofa', price: fresh.price.merchandisePence / 100, quantity, image: build.price.image, itemType: 'sofa', buildSnapshot: build });
      continue;
    }
    if (!products.has(productId)) products.set(productId, findProduct(productId));
    // Store failures must fail checkout; client prices are never a fallback.
    const product = await products.get(productId);
    if (!product) return fail('A sofa is no longer available. Please refresh your basket and remove the unavailable item.');
    const variant = product.variants.find((option) => option.id === variantId);
    if (!variant) return fail(`A colour for ${product.title} is no longer available. Please refresh your basket and choose another colour.`);

    const offerPrice = item.offerToken ? validOffer(item.offerToken, product, variantId, await records()) : undefined;
    if (item.offerToken && offerPrice === undefined) return fail('Your ALASHI offer has expired or changed. Please ask ALASHI for a new offer.');
    const currentPennies = pennies(offerPrice ?? Number(variant.price));
    if (currentPennies === undefined || pennies(item.price) !== currentPennies) {
      return fail(`The price of ${product.title} has changed. Please refresh your basket and add this sofa again to use its current price.`);
    }
    const key = JSON.stringify([productId, variantId]);
    const quantity = (validated.get(key)?.quantity || 0) + item.quantity;
    if (quantity > 10) return fail(`You can order up to 10 of ${product.title} in ${variant.color}. Please update your basket quantity.`);
    validated.set(key, {
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      color: variant.color,
      range_type: variant.range_type,
      price: currentPennies / 100,
      quantity,
      image: getVariantImages(product, variant)[0] || '',
      itemType: 'sofa',
    });
  }
  if (!hasSofa) return fail('Please add a sofa before checking out. A fabric swatch cannot be purchased on its own.');
  return [...validated.values()];
}
