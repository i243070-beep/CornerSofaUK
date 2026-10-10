// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ files: new Map<string, { body: string; etag: string }>(), version: 0 }));
vi.mock('@vercel/blob', () => {
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobPreconditionFailedError,
    get: vi.fn(async (key: string, options: { useCache: boolean; access: string }) => {
      expect(options).toMatchObject({ useCache: false, access: 'private', headers: { 'Accept-Encoding': 'identity' } });
      const file = storage.files.get(key);
      return file ? { stream: new Response(file.body).body, blob: { etag: file.etag } } : null;
    }),
    put: vi.fn(async (key: string, body: string, options: { allowOverwrite: boolean; ifMatch?: string; access: string }) => {
      expect(options.access).toBe('private');
      const previous = storage.files.get(key);
      if (options.ifMatch && previous?.etag !== options.ifMatch) throw new BlobPreconditionFailedError();
      if (!options.allowOverwrite && previous) throw new Error('Blob already exists');
      storage.files.set(key, { body, etag: String(++storage.version) });
    }),
    list: vi.fn(async ({ prefix }: { prefix: string }) => ({ blobs: [...storage.files.keys()].filter(key => key.startsWith(prefix)).map(pathname => ({ pathname })), hasMore: false })),
    del: vi.fn(async (key: string) => storage.files.delete(key)),
  };
});
import { readCloudJson, mutateCloudJson, insertCloudJson, listCloudJson, deleteCloudData, usesCloudData } from '../lib/cloud-data';
beforeEach(() => { storage.files.clear(); vi.stubEnv('VERCEL', '1'); vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test'); vi.stubEnv('SHOP_DATA_PREFIX', 'test/'); });
afterEach(() => vi.unstubAllEnvs());

describe('private deployed data storage', () => {
  it('keeps local development on its existing files', () => { vi.stubEnv('VERCEL', ''); expect(usesCloudData()).toBe(false); });
  it('does not lose concurrent order updates', async () => {
    await Promise.all(Array.from({ length: 4 }, (_, id) => mutateCloudJson('orders.json', [] as number[], orders => { orders.push(id); })));
    expect((await readCloudJson<number[]>('orders.json'))?.sort()).toEqual([0, 1, 2, 3]);
  });
  it('preserves the first quotation for duplicate submissions', async () => {
    const results = await Promise.all([insertCloudJson('quote.json', { id: 'first' }), insertCloudJson('quote.json', { id: 'second' })]);
    expect(results[0]).toEqual(results[1]);
  });
  it('lists records and deletes only the specified record', async () => {
    await insertCloudJson('builder/a.json', { id: 'a' }); await insertCloudJson('builder/b.json', { id: 'b' });
    await deleteCloudData('builder/a.json'); expect(await listCloudJson('builder/')).toEqual([{ id: 'b' }]);
  });
});
