import { copyFile, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const localDirectory = process.env.PRODUCT_DATA_DIR || path.join(frontend, '.local-data');
const source = path.join(localDirectory, 'products.json');
const destination = path.join(frontend, 'src/data/catalogue.json');
let contents;
try {
  contents = await readFile(source, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  contents = await readFile(destination, 'utf8');
}
const products = JSON.parse(contents);
if (!Array.isArray(products) || !products.length) throw new Error('The catalogue must contain products.');

async function exportImage(image) {
  const match = /^\/api\/(sofa-previews|product-images)\/([a-f0-9]{64}\.webp)$/.exec(image);
  if (match) {
    const directory = match[1] === 'product-images' ? 'product-photos' : 'sofa-previews';
    const target = `/images/${directory}/${match[2]}`;
    const targetFile = path.join(frontend, 'public', target);
    await mkdir(path.dirname(targetFile), { recursive: true });
    await copyFile(path.join(localDirectory, directory, match[2]), targetFile);
    return target;
  }
  return image;
}

for (const product of products) {
  for (const entry of [product, ...(product.variants || [])]) {
    entry.images = await Promise.all((entry.images || []).map(exportImage));
    for (const image of entry.images) {
      if (image.startsWith('/')) await access(path.join(frontend, 'public', image));
    }
  }
}
await writeFile(destination, JSON.stringify(products, null, 2) + '\n');
console.log(`Prepared ${products.length} products with verified, deployable photos.`);
