import { get, put, list, del, BlobPreconditionFailedError } from '@vercel/blob';

// Local development keeps its existing files. Deployed functions use private storage.
export const usesCloudData = () => Boolean(process.env.VERCEL && (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID));
const prefix = () => process.env.SHOP_DATA_PREFIX || 'shop-data/';
const pathname = (key: string) => `${prefix()}${key}`;
const auth = () => ({ token: process.env.BLOB_READ_WRITE_TOKEN });

async function read(key: string) {
  // Use the stored representation's strong ETag for conditional writes.
  const result = await get(pathname(key), { ...auth(), access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' } });
  return result ? { bytes: Buffer.from(await new Response(result.stream).arrayBuffer()), etag: result.blob.etag } : undefined;
}
export async function readCloudBytes(key: string) { return (await read(key))?.bytes; }
export async function writeCloudBytes(key: string, bytes: Buffer) {
  await put(pathname(key), bytes, { ...auth(), access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'image/webp' });
}
export async function readCloudJson<T>(key: string): Promise<T | undefined> {
  const result = await read(key);
  return result ? JSON.parse(result.bytes.toString('utf8')) as T : undefined;
}
export async function writeCloudJson(key: string, value: unknown) {
  await put(pathname(key), JSON.stringify(value), { ...auth(), access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
}
export async function insertCloudJson<T>(key: string, value: T): Promise<T> {
  try {
    await put(pathname(key), JSON.stringify(value), { ...auth(), access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
    return value;
  } catch (error) {
    const existing = await readCloudJson<T>(key);
    if (existing === undefined) throw error;
    return existing;
  }
}
export async function mutateCloudJson<T, R>(key: string, initial: T, update: (value: T) => R | Promise<R>): Promise<R> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await read(key);
    const value: T = current ? JSON.parse(current.bytes.toString('utf8')) : structuredClone(initial);
    const result = await update(value);
    try {
      await put(pathname(key), JSON.stringify(value), {
        ...auth(), access: 'private', addRandomSuffix: false, allowOverwrite: Boolean(current),
        ...(current ? { ifMatch: current.etag } : {}), contentType: 'application/json',
      });
      return result;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) && (current || !(await read(key)))) throw error;
    }
  }
  throw new Error('Another update is in progress. Please try again.');
}
export async function listCloudJson<T>(folder: string): Promise<T[]> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ ...auth(), prefix: pathname(folder), cursor });
    keys.push(...result.blobs.filter(blob => blob.pathname.endsWith('.json')).map(blob => blob.pathname.slice(prefix().length)));
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  const values = await Promise.all(keys.map(key => readCloudJson<T>(key)));
  return values.filter(value => value !== undefined) as T[];
}
export async function deleteCloudData(key: string) { await del(pathname(key), auth()); }
