import replacements from '@/data/product-room-images.json';
import type { StoreProduct } from './product-options';

const rooms: Readonly<Record<string, string>> = replacements;
const originals = new Map(Object.entries(rooms).map(([source, image]) => [image, source]));

/** Keep originals available in the gallery and for the room planner's sofa selection. */
export function originalProductImage(image: string) {
  return originals.get(image) || image;
}

function withRoomPhotos(images: string[] = []) {
  return [...new Set(images.flatMap(image => {
    if (!rooms[image]) return [image];
    // Retain source photographs, but do not resurface superseded automatic colour renders.
    return image.startsWith('/api/sofa-previews/') ? [rooms[image]] : [rooms[image], image];
  }))];
}

export function applyProductRoomImages<T extends StoreProduct>(product: T): T {
  return {
    ...product,
    images: withRoomPhotos(product.images),
    variants: product.variants.map(variant => ({ ...variant, images: withRoomPhotos(variant.images) })),
  };
}
