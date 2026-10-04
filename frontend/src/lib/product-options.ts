export interface ProductVariant {
  id: string;
  range_type: string;
  price: number;
  stock: number;
  color: string;
  color_hex?: string | null;
  images?: string[];
  sku?: string;
  source_variant_id?: string | number;
}

export interface StoreProduct {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  base_price: number;
  compare_at_price?: number | null;
  images: string[];
  category: string;
  categories?: string[];
  status?: 'published' | 'draft';
  price_type?: 'base' | 'fixed' | 'from';
  review_flags?: string[];
  source_site?: string;
  source_product_id?: string | number;
  source_url?: string;
  specifications?: Record<string, string | string[]>;
  features?: string[];
  materials?: string[];
  stock_confirmation_required?: boolean;
  dimensions_cm?: { width: number; depth: number; height: number } | null;
  variants: ProductVariant[];
}

const colourPreviews: Record<string, string> = {
  bourneville: '#5c3a21', charcoal: '#484b47', beige: '#d4c5a9', graphite: '#474a51',
  mushroom: '#b6aa99', cream: '#ece6d8', cognac: '#995d35', black: '#292a28',
  ivory: '#f1ecdf', 'light grey': '#cbccc7', grey: '#969b96', mink: '#8b7355',
  oatmeal: '#d4c5a0', green: '#64715c', olive: '#6a7358', blue: '#596e7c', navy: '#344450',
};

export function getColourHex(variant: Pick<ProductVariant, 'color' | 'color_hex'>) {
  return /^#[0-9a-f]{6}$/i.test(variant.color_hex || '')
    ? variant.color_hex!
    : colourPreviews[variant.color.toLowerCase()] || '#d5d8cf';
}

export function getDefaultVariant(variants: ProductVariant[] = []) {
  return variants.reduce<ProductVariant | undefined>(
    (best, variant) => !best || Number(variant.price) < Number(best.price) ? variant : best, undefined,
  );
}

export function getProductPrice(product: Pick<StoreProduct, 'base_price' | 'variants'>) {
  return Number(getDefaultVariant(product.variants)?.price ?? product.base_price);
}

export function getVariantImages(product: Pick<StoreProduct, 'images'>, variant?: ProductVariant | null) {
  return variant?.images?.length ? variant.images : product.images;
}

export function getSavings(price: number, compareAtPrice?: number | null) {
  const difference = Math.round((Number(compareAtPrice) - Number(price)) * 100);
  return Number.isFinite(difference) && difference > 0 ? difference / 100 : 0;
}

export const formatProductPrice = (price: number) => new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(price));
