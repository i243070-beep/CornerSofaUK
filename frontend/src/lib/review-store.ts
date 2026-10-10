import { randomUUID } from 'crypto';
import { mkdir, readFile, readdir, writeFile, rename } from 'fs/promises';
import path from 'path';
import { isDatabaseConfigured, sql } from './db';
import { usesCloudData, listCloudJson, writeCloudJson } from './cloud-data';
import type { CustomerReview } from './reviews';

const directory = () => path.join(process.env.REVIEW_DATA_DIR || process.env.PRODUCT_DATA_DIR || path.join(process.cwd(), '.local-data'), 'reviews');
let schema: Promise<unknown> | undefined;
function ensureSchema() {
  return schema ||= sql`CREATE TABLE IF NOT EXISTS customer_sofa_reviews (
    id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_title TEXT NOT NULL, name TEXT NOT NULL, rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL, photos JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`.catch(error => { schema = undefined; throw error; });
}
export async function listReviews(): Promise<CustomerReview[]> {
  if (!isDatabaseConfigured && usesCloudData()) return (await listCloudJson<CustomerReview>('reviews/')).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (isDatabaseConfigured) {
    await ensureSchema();
    return await sql`SELECT * FROM customer_sofa_reviews ORDER BY created_at DESC` as CustomerReview[];
  }
  await mkdir(directory(), { recursive: true });
  const files = (await readdir(directory())).filter(file => /^[a-f0-9-]+\.json$/.test(file));
  const reviews = await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(directory(), file), 'utf8')) as CustomerReview));
  return reviews.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export async function saveReview(input: Omit<CustomerReview, 'id' | 'created_at'>): Promise<CustomerReview> {
  const review = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  if (!isDatabaseConfigured && usesCloudData()) { await writeCloudJson(`reviews/${review.id}.json`, review); return review; }
  if (isDatabaseConfigured) {
    await ensureSchema();
    await sql`INSERT INTO customer_sofa_reviews (id,product_id,product_title,name,rating,text,photos,created_at)
      VALUES (${review.id},${review.product_id},${review.product_title},${review.name},${review.rating},${review.text},${JSON.stringify(review.photos)}::jsonb,${review.created_at})`;
  } else {
    await mkdir(directory(), { recursive: true });
    const file = path.join(directory(), `${review.id}.json`);
    await writeFile(`${file}.tmp`, JSON.stringify(review), 'utf8');
    await rename(`${file}.tmp`, file);
  }
  return review;
}
