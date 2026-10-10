import { randomUUID } from 'crypto';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import bundledCatalogue from '@/data/catalogue.json';
import type { StoreProduct } from './product-options';
import { usesCloudData, readCloudJson, mutateCloudJson } from './cloud-data';

export type LocalProduct = StoreProduct;

const premiumImages: Record<string, string> = {
  '2-Seater': '/images/sofas/premium-two-seater.webp',
  '3-Seater': '/images/sofas/premium-three-seater.webp',
  Corner: '/images/sofas/premium-corner.webp',
  Recliner: '/images/sofas/premium-recliners.webp',
};

const seedDetails = [
  ['chesterfield-2-seater', 'Chesterfield 2-Seater Sofa', 'Classic deep buttoned Chesterfield in genuine leather.', 2199, '2-Seater', 'Cognac', 3],
  ['velvet-2-seater', 'Velvet 2-Seater Sofa', 'Plush velvet upholstery with slim oak legs.', 1799, '2-Seater', 'Bourneville', 5],
  ['linen-2-seater', 'Linen 2-Seater Sofa', 'Relaxed linen blend with feather-filled cushions.', 1499, '2-Seater', 'Mushroom', 7],
  ['velvet-3-seater', 'Velvet 3-Seater Sofa', 'Luxurious velvet sofa with a deep, supportive seat.', 2499, '3-Seater', 'Charcoal', 3],
  ['boucle-3-seater', 'Boucle 3-Seater Sofa', 'Textured boucle fabric with cloud-like comfort.', 2899, '3-Seater', 'Cream', 3],
  ['leather-3-seater', 'Leather 3-Seater Sofa', 'Premium aniline leather with a natural patina.', 2799, '3-Seater', 'Cognac', 2],
  ['velvet-corner-left', 'Velvet Corner Sofa — Left Facing', 'Generous left-facing corner sofa in premium velvet.', 3299, 'Corner', 'Bourneville', 2],
  ['velvet-corner-right', 'Velvet Corner Sofa — Right Facing', 'Generous right-facing corner sofa in premium velvet.', 3299, 'Corner', 'Charcoal', 4],
  ['leather-corner', 'Leather Corner Sofa', 'Statement corner sofa in full-grain leather.', 3599, 'Corner', 'Cognac', 1],
  ['velvet-recliner-pair', 'Velvet Recliner Pair', 'A pair of electric recliners in soft velvet.', 2999, 'Recliner', 'Bourneville', 3],
  ['leather-recliner', 'Leather Recliner Sofa', 'Manual recliner in durable bonded leather.', 2299, 'Recliner', 'Cognac', 4],
  ['fabric-recliner-pair', 'Fabric Recliner Pair', 'A pair of manual recliners in easy-clean fabric.', 1799, 'Recliner', 'Light Grey', 5],
] as const;

const seedProducts: LocalProduct[] = seedDetails.map((item, index) => ({
  id: `a1000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
  slug: item[0],
  title: item[1],
  description: item[2],
  base_price: item[3],
  images: [premiumImages[item[4]]],
  category: item[4],
  variants: [{
    id: `local-variant-${index + 1}`,
    range_type: item[4],
    price: item[3],
    stock: item[6],
    color: item[5],
  }],
}));

const dataDirectory = process.env.PRODUCT_DATA_DIR || path.join(process.cwd(), '.local-data');
const productsFile = path.join(dataDirectory, 'products.json');
const bundledProducts = structuredClone(bundledCatalogue) as LocalProduct[];

async function saveProducts(products: LocalProduct[]) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${productsFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(products, null, 2), 'utf8');
  await rename(temporaryFile, productsFile);
}

export async function getLocalProducts(): Promise<LocalProduct[]> {
  if (usesCloudData()) return await readCloudJson<LocalProduct[]>('products.json') || structuredClone(bundledProducts);
  try {
    return JSON.parse(await readFile(productsFile, 'utf8')) as LocalProduct[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const products = bundledProducts.length ? bundledProducts : seedProducts;
    if (!process.env.VERCEL) {
      await saveProducts(products);
    }
    return structuredClone(products);
  }
}

export async function getLocalProduct(id: string) {
  return (await getLocalProducts()).find((product) => product.id === id);
}

export async function createLocalProduct(input: Omit<LocalProduct, 'id'>) {
  if (usesCloudData()) return mutateCloudJson('products.json', bundledProducts, products => {
    const product: LocalProduct = { ...input, id: randomUUID() }; products.unshift(product); return product;
  });
  const products = await getLocalProducts();
  const product: LocalProduct = { ...input, id: randomUUID() };
  products.unshift(product);
  await saveProducts(products);
  return product;
}

export async function updateLocalProduct(id: string, changes: Partial<LocalProduct>) {
  if (usesCloudData()) return mutateCloudJson('products.json', bundledProducts, products => {
    const index = products.findIndex(product => product.id === id);
    if (index < 0) return undefined;
    products[index] = { ...products[index], ...changes, id }; return products[index];
  });
  const products = await getLocalProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return undefined;
  products[index] = { ...products[index], ...changes, id };
  await saveProducts(products);
  return products[index];
}

export async function deleteLocalProduct(id: string) {
  if (usesCloudData()) return mutateCloudJson('products.json', bundledProducts, products => {
    const index = products.findIndex(product => product.id === id);
    if (index < 0) return undefined;
    const [product] = products.splice(index, 1); return { id: product.id, title: product.title };
  });
  const products = await getLocalProducts();
  const product = products.find((candidate) => candidate.id === id);
  if (!product) return undefined;
  await saveProducts(products.filter((candidate) => candidate.id !== id));
  return { id: product.id, title: product.title };
}
