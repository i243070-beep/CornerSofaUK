import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { convertProduct, imagePath, mergeCatalogue, sourceKey } from './import-sofa-catalogue.mjs';

const catalogue = JSON.parse(await fs.readFile(new URL('../../backend/sofa-catalogue-for-codex.json', import.meta.url), 'utf8'));
const images = new Map(catalogue.products.flatMap(product => [...product.images.map(image => image.url), ...product.variants.map(variant => variant.image_url).filter(Boolean)]).map(url => [url, imagePath(url)]));
const converted = catalogue.products.map(product => convertProduct(product, images));

test('all 108 products retain distinct source identities and the supplied review status', () => {
  assert.equal(converted.length, 108);
  assert.equal(new Set(converted.map(product => product.id)).size, 108);
  assert.equal(converted.filter(product => product.status === 'published').length, 73);
  assert.equal(converted.filter(product => product.status === 'draft').length, 35);
  converted.forEach((product, index) => assert.equal(sourceKey(product), sourceKey(catalogue.products[index])));
});
test('secondary sofa-bed and recliner categories remain searchable, accessories stay separate', () => {
  const bed = converted.find(product => product.source_product_id === 429);
  assert.ok(bed.categories.includes('Sofa Bed'));
  assert.ok(bed.categories.includes('Corner'));
  assert.equal(converted.filter(product => product.category === 'Armchairs').length, 3);
  assert.equal(converted.filter(product => product.category === 'Footstools').length, 1);
  assert.ok(converted.find(product => product.source_product_id === 864).categories.includes('Recliner'));
});
test('repeat imports preserve existing products and admin edits without name-based merging', () => {
  const existing = { id: 'old', title: converted[0].title, base_price: 999 };
  const edited = { ...converted[0], base_price: 1234 };
  const merged = mergeCatalogue([existing, edited], converted);
  assert.equal(merged.length, 109);
  assert.equal(merged[0], existing);
  assert.equal(merged[1], edited);
  assert.deepEqual(mergeCatalogue(merged, converted), merged);
});
test('range prices stay ranges and each selected configuration retains its exact price', () => {
  const source = catalogue.products.find(product => product.source_product_id === 864);
  const product = convertProduct(source, images);
  assert.equal(product.price_type, 'from');
  assert.equal(product.compare_at_price, null);
  assert.equal(product.variants.find(variant => variant.range_type === '3 2 seater').price, 600);
  assert.equal(product.status, 'draft');
});
test('gallery images never create additional purchasable colours or invented stock', () => {
  const source = catalogue.products.find(product => product.source_product_id === 2274);
  const product = convertProduct(source, images);
  assert.equal(product.variants.length, 1);
  assert.equal(product.variants[0].color, 'As pictured');
  assert.ok(converted.every(product => product.variants.every(variant => variant.stock === 0)));
  assert.ok(converted.every(product => product.stock_confirmation_required));
});
test('failed image downloads hold an otherwise ready product in draft', () => {
  const product = convertProduct(catalogue.products[0], new Map());
  assert.equal(product.status, 'draft');
  assert.ok(product.review_flags.some(flag => flag.includes('images')));
});
test('every imported photo is local and variants retain the full product gallery', () => {
  assert.ok(converted.every(product => product.images.every(image => image.startsWith('/images/catalogue/'))));
  assert.ok(converted[0].variants[0].images.length >= converted[0].images.length);
});
