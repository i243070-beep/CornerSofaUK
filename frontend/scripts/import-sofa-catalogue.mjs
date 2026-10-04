import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const categoryMap = {
  'corner-sofas': 'Corner', '3-2-seater-sofa-sets': 'Sofa Sets', 'sofa-sets': 'Sofa Sets',
  'u-shaped-sofas': 'U-Shape', 'armchairs': 'Armchairs', 'footstools': 'Footstools',
  '2-seater-sofas': '2-Seater', '3-seater-sofas': '3-Seater', 'electric-recliners': 'Recliner',
  'recliner-sofas': 'Recliner', 'sofa-beds': 'Sofa Bed',
};
export const sourceKey = product => `${product.source_site}:${product.source_product_id}`;
const uuid = value => {
  const hash = createHash('sha256').update(value).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
export const imagePath = url => `/images/catalogue/${createHash('sha256').update(url).digest('hex').slice(0, 24)}.webp`;
const cleanTitle = title => title.split('|')[0].replace(/\s+by furnishings hub\b/ig, '').replace(/\s*[–—]\s*Luxury.*$/i, '').trim();

export function convertProduct(source, downloaded) {
  const key = sourceKey(source);
  const category = categoryMap[source.primary_category];
  if (!category) throw Error(`Unmapped category: ${source.primary_category}`);
  if (typeof source.price !== 'number' || !Number.isFinite(source.price) || source.price <= 0) throw Error(`Missing price: ${key}`);
  const categories = [...new Set([category, ...source.categories.map(value => categoryMap[value]).filter(Boolean)])];
  const images = [...new Set(source.images.map(image => downloaded.get(image.url)).filter(Boolean))];
  const flags = [...source.review_flags];
  if (!images.length) flags.push('Product images could not be downloaded.');
  const variants = source.variants.filter(variant => Number.isFinite(variant.price) && variant.price > 0).map(variant => ({
    id: uuid(`${key}:${variant.source_variant_id}`),
    source_variant_id: variant.source_variant_id,
    range_type: Object.values(variant.attributes || {}).join(' / ').replace(/-/g, ' ') || category,
    color: variant.colour || (source.colours.length === 1 ? source.colours[0] : 'As pictured'),
    color_hex: /^#[0-9a-f]{6}$/i.test(variant.colour_hex || '') ? variant.colour_hex : null,
    price: variant.price,
    stock: 0,
    images: downloaded.has(variant.image_url) ? [...new Set([downloaded.get(variant.image_url), ...images])] : images,
    sku: `IMPORT-${uuid(`${key}:${variant.source_variant_id}`)}`,
  }));
  // Gallery colours are not evidence of purchasable options. A fixed listing has one pictured option.
  if (!variants.length && source.price_type !== 'from') variants.push({
    id: uuid(`${key}:pictured`), range_type: category, color: source.colours.length === 1 ? source.colours[0] : 'As pictured',
    color_hex: null, price: source.price, stock: 0, images, sku: `IMPORT-${uuid(`${key}:pictured`)}`,
  });
  if (source.price_type === 'from' && variants.some(variant => variant.range_type === category)) flags.push('Variant configuration labels require confirmation.');
  const highestPrice = Math.max(source.price, ...variants.map(variant => variant.price));
  const original = source.regular_price > highestPrice && source.price_type !== 'from' ? source.regular_price : null;
  return {
    id: uuid(key), slug: source.slug, title: cleanTitle(source.name), description: source.description,
    base_price: source.price, compare_at_price: original, price_type: source.price_type,
    category, categories, images, variants,
    status: source.import_status === 'ready' && !flags.length ? 'published' : 'draft',
    stock_confirmation_required: true,
    source_site: source.source_site, source_product_id: source.source_product_id, source_url: source.source_url,
    source_categories: source.source_categories, source_catalogue_id: source.id,
    source_price_range: source.price_range, source_in_stock: source.in_stock_source ?? null,
    materials: source.materials, specifications: source.specifications, features: source.features,
    review_flags: flags,
  };
}

export function mergeCatalogue(existing, imported) {
  const keys = new Set(existing.filter(product => product.source_site).map(sourceKey));
  return [...existing, ...imported.filter(product => !keys.has(sourceKey(product)))];
}

async function run() {
  try { process.loadEnvFile(path.join(root, '.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (process.env.DATABASE_URL) throw Error('This importer targets local storage. DATABASE_URL is configured; no data has been changed.');
  const source = JSON.parse(await fs.readFile(path.join(root, '../backend/sofa-catalogue-for-codex.json'), 'utf8'));
  const ids = new Set(source.products.map(sourceKey));
  if (ids.size !== source.products.length) throw Error('Duplicate source IDs in the input.');
  for (const [site, expected] of Object.entries(source.coverage.expected_counts)) {
    if (source.products.filter(product => product.source_site === site).length !== expected) throw Error(`Source count mismatch for ${site}`);
  }
  const directory = process.env.PRODUCT_DATA_DIR || path.join(root, '.local-data');
  const file = path.join(directory, 'products.json');
  const existing = JSON.parse(await fs.readFile(file, 'utf8'));
  const urls = [...new Set(source.products.flatMap(product => [...product.images.map(image => image.url), ...product.variants.map(variant => variant.image_url).filter(Boolean)]))];
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ products: source.products.length, existing: existing.length, images: urls.length, ready: source.products.filter(product => product.import_status === 'ready').length, draft: source.products.filter(product => product.import_status === 'draft').length, action: 'Run with --apply to download images, back up and import. Existing source IDs are preserved on repeat runs.' }, null, 2));
    return;
  }
  await fs.mkdir(path.join(root, 'public/images/catalogue'), { recursive: true });
  const downloaded = new Map();
  const failures = [];
  let next = 0;
  let complete = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      const local = imagePath(url);
      const destination = path.join(root, 'public', local);
      try {
        try { await sharp(destination).metadata(); }
        catch {
          let failure;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
              if (!response.ok) throw Error(`HTTP ${response.status}`);
              const bytes = Buffer.from(await response.arrayBuffer());
              await sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(`${destination}.tmp`);
              await fs.rename(`${destination}.tmp`, destination);
              failure = null;
              break;
            } catch (error) { failure = error; }
          }
          if (failure) throw failure;
        }
        downloaded.set(url, local);
      } catch (error) { failures.push({ url, error: error.message }); }
      complete++;
      if (complete % 25 === 0 || complete === urls.length) console.log(`Images: ${complete}/${urls.length}; failures: ${failures.length}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  if (!downloaded.size) throw Error('No images could be downloaded; catalogue unchanged. Check network access.');
  const imported = source.products.map(product => convertProduct(product, downloaded));
  const merged = mergeCatalogue(existing, imported);
  const added = merged.length - existing.length;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let backup = null;
  if (added) {
    await fs.mkdir(path.join(directory, 'backups'), { recursive: true });
    backup = path.join(directory, 'backups', `products-before-import-${stamp}.json`);
    await fs.copyFile(file, backup);
    await fs.writeFile(`${file}.import.tmp`, JSON.stringify(merged, null, 2));
    await fs.rename(`${file}.import.tmp`, file);
  }
  const byCategory = Object.fromEntries([...new Set(imported.map(product => product.category))].map(category => [category, {
    total: imported.filter(product => product.category === category).length,
    published: imported.filter(product => product.category === category && product.status === 'published').length,
  }]));
  const report = { imported_at: new Date().toISOString(), source_products: source.products.length, added, existing_preserved: existing.length,
    published: imported.filter(product => product.status === 'published').length, drafts: imported.filter(product => product.status === 'draft').length,
    by_category: byCategory, images_downloaded: downloaded.size, image_failures: failures, backup,
    by_navigation_category: Object.fromEntries([...new Set(imported.flatMap(product => product.categories))].map(category => [category, {
      total: imported.filter(product => product.categories.includes(category)).length,
      published: imported.filter(product => product.categories.includes(category) && product.status === 'published').length,
    }])),
    stock: 'Quantities are not provided by the source. Imported stock is zero until confirmed in admin; availability enquiry is offered on the storefront.',
    unresolved: imported.filter(product => product.review_flags.length).map(product => ({ id: product.id, source: sourceKey(product), title: product.title, flags: product.review_flags })),
    duplicate_candidates: source.duplicate_candidates,
    existing_title_matches: imported.flatMap(product => existing.filter(old => !old.source_site && old.title.split('|')[0].trim().toLowerCase() === product.title.toLowerCase()).map(old => ({ existing_id: old.id, imported_id: product.id, action: 'Preserved separately for review' }))),
  };
  await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
  await fs.writeFile(path.join(root, 'artifacts/catalogue-import-report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(root, 'artifacts/catalogue-image-manifest.json'), JSON.stringify(Object.fromEntries(downloaded), null, 2));
  console.log(JSON.stringify({ added, published: report.published, drafts: report.drafts, total: merged.length, images: downloaded.size, failures: failures.length, report: 'artifacts/catalogue-import-report.json' }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run().catch(error => { console.error(error.message); process.exitCode = 1; });
