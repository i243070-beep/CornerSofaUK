import { describe, expect, it, vi } from 'vitest';
import type { StoreProduct } from '../lib/product-options';

const fixtures = vi.hoisted(() => [
  { id: 'existing', title: 'Existing sofa', base_price: 500, category: 'Corner', images: ['/sofa.webp'], variants: [] },
  { id: 'ready', title: 'Ready sofa', base_price: 600, category: 'Corner', status: 'published', images: ['/ready.webp'], variants: [] },
  { id: 'draft', title: 'Unreviewed sofa', base_price: 300, category: 'Sofa Sets', status: 'draft', review_flags: ['Confirm set price'], images: ['/draft.webp'], variants: [] },
]);
vi.mock('../lib/db', () => ({ isDatabaseConfigured: false, sql: vi.fn() }));
vi.mock('../lib/local-products', () => ({
  getLocalProducts: vi.fn(async () => fixtures),
  getLocalProduct: vi.fn(async (id: string) => fixtures.find(product => product.id === id)),
}));
import { findProduct, listProducts } from '../lib/product-store';
import { validateProductInput } from '../lib/product-validation';
import { inCategory } from '../lib/product-categories';

describe('imported catalogue visibility', () => {
  it('keeps drafts out of storefront, room-planner and checkout lookups', async () => {
    expect((await listProducts()).map(product => product.id)).toEqual(['existing', 'ready']);
    expect(await findProduct('draft')).toBeUndefined();
  });
  it('lets admin inspect drafts explicitly', async () => {
    expect(await listProducts({ includeDrafts: true })).toHaveLength(3);
    expect((await findProduct('draft', { includeDrafts: true }))?.status).toBe('draft');
  });
  it('requires confirmation of unresolved details before publishing', () => {
    const draft = { ...fixtures[2], slug: 'draft' } as StoreProduct;
    expect(() => validateProductInput({ ...draft, status: 'published' }, draft)).toThrow('Review the flagged');
    expect(validateProductInput({ ...draft, status: 'published', review_confirmed: true }, draft)).toMatchObject({ status: 'published', review_flags: [] });
    expect(validateProductInput({ ...draft, title: 'Edited draft' }, draft).status).toBe('draft');
  });
  it('matches primary and secondary categories without including accessories in sofas', () => {
    expect(inCategory({ category: 'Corner', categories: ['Corner', 'Sofa Bed'] }, 'Sofa Bed')).toBe(true);
    expect(inCategory({ category: 'Armchairs', categories: ['Armchairs'] }, '2-Seater,3-Seater')).toBe(false);
  });
});
