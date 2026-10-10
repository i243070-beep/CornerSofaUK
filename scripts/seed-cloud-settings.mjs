import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { get, put } from '@vercel/blob';

const auth = { token: process.env.BLOB_READ_WRITE_TOKEN };
if (!auth.token) throw new Error('Private storage is not configured.');
let count = 0;
async function insert(key, value) {
  const pathname = `shop-data/${key}`;
  if (await get(pathname, { ...auth, access: 'private', useCache: false })) return;
  await put(pathname, JSON.stringify(value), { ...auth, access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
  count++;
}
for (const file of await readdir('frontend/.local-data/alashi')) {
  if (!file.endsWith('.json')) continue;
  const record = JSON.parse(await readFile(`frontend/.local-data/alashi/${file}`, 'utf8'));
  if (['delivery', 'range', 'facts', 'knowledge'].includes(record.kind)) await insert(`alashi/${createHash('sha256').update(record.id).digest('hex')}.json`, record);
}
for (const file of await readdir('frontend/.local-data/builder')) {
  if (!file.endsWith('.json')) continue;
  const record = JSON.parse(await readFile(`frontend/.local-data/builder/${file}`, 'utf8'));
  if (['settings', 'fabrics'].includes(record.id)) await insert(`builder/${file}`, record);
}
console.log(`Imported ${count} existing business settings into private deployment storage.`);
