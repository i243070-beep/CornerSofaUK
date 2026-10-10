'use client';
import { readApiJson } from '@/lib/api-json';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, LayoutGrid, List, RotateCcw, Search, SlidersHorizontal, Sofa, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ensureLocalProductImages, sofaImageForCategory } from '@/lib/product-images';
import { ProductCard, Spinner } from '@/components/ui';
import { getProductPrice, type StoreProduct } from '@/lib/product-options';

import CatalogueHero from '@/components/CatalogueHero';
import { SOFA_CATEGORIES, categoryLabel as labelForCategory, inCategory } from '@/lib/product-categories';

const CATEGORIES = ['All', ...SOFA_CATEGORIES] as const;
type Category = typeof CATEGORIES[number] | '2-Seater,3-Seater';
const FABRICS = ['All fabrics', 'Velvet', 'Linen', 'Bouclé', 'Leather', 'Fabric'] as const;
const FABRIC_KEYWORDS: Record<string, string[]> = {
  Velvet: ['velvet'],
  Linen: ['linen'],
  'Bouclé': ['bouclé', 'boucle'],
  Leather: ['leather', 'chesterfield'],
  Fabric: ['fabric'],
};
type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';
const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Recommended',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'name-asc': 'Name: A to Z',
};
const CATEGORY_COPY: Record<Category, string> = {
  All: 'Find your kind of comfort.',
  '2-Seater,3-Seater': 'Good company. Great comfort.',
  '2-Seater': 'Small space. Big comfort.',
  '3-Seater': 'A little more room to unwind.',
  Corner: 'Bring everyone together.',
  'U-Shape': 'Room for everyone to relax.',
  'Sofa Bed': 'A comfortable seat. A welcoming bed.',
  Recliner: 'Put your feet up. Settle in.',
  'Sofa Sets': 'Made to belong together.',
  Armchairs: 'Your own little corner of comfort.',
  Footstools: 'The perfect finishing touch.',
};
const normaliseCategory = (value: string | null): Category => {
  if (value === '2-Seater,3-Seater' || value === '3-Seater,2-Seater') return '2-Seater,3-Seater';
  return CATEGORIES.includes(value as typeof CATEGORIES[number]) ? value as Category : 'All';
};
const formatPrice = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);

export default function ProductsClient({ initialProducts }: { initialProducts?: StoreProduct[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [products, setProducts] = useState<StoreProduct[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [category, setCategory] = useState<Category>(normaliseCategory(searchParams.get('category')));
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [fabric, setFabric] = useState<string>('All fabrics');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  useEffect(() => { setVisibleCount(12); }, [category, query, fabric, sortBy, maxPrice]);
  useEffect(() => { setMaxPrice(null); }, [category]);
  const categoryLabel = category === 'All' ? 'All sofas' : category === '2-Seater,3-Seater' ? '2 & 3 seater sofas' : labelForCategory(category);

  useEffect(() => {
    setCategory(normaliseCategory(searchParams.get('category')));
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function fetchProducts(showLoader = false) {
      controller?.abort();
      controller = new AbortController();
      const requestController = controller;
      if (showLoader) setLoading(true);
      try {
        const res = await fetch('/api/products/', { cache: 'no-store', signal: requestController.signal });
        if (!res.ok) throw new Error('Unable to load products');
        const data = await readApiJson(res);
        if (!Array.isArray(data)) throw new Error('Invalid catalogue response');
        if (active && !requestController.signal.aborted) {
          setProducts(data.map(ensureLocalProductImages));
          setLoadError(false);
          setLoading(false);
        }
      } catch {
        if (active && !requestController.signal.aborted) {
          setLoadError(true);
          setLoading(false);
        }
      }
    }

    if (!initialProducts || reloadKey > 0) fetchProducts(true);
    const refresh = () => fetchProducts();
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('corner-sofa-products') : null;
    channel?.addEventListener('message', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      controller?.abort();
      channel?.close();
      window.removeEventListener('focus', refresh);
    };
  }, [reloadKey, initialProducts]);

  const categoryProducts = useMemo(() => products.filter(product => category === 'All' || inCategory(product, category)), [products, category]);
  const categoryPrices = categoryProducts.map(getProductPrice);
  const priceFloor = categoryPrices.length ? Math.min(...categoryPrices) : 0;
  const priceCeiling = Math.max(priceFloor + 1, ...categoryPrices);
  const priceRange = categoryPrices.length ? `${formatPrice(priceFloor)} – ${formatPrice(Math.max(...categoryPrices))}` : '';
  const activeFilterCount = Number(category !== 'All') + Number(fabric !== 'All fabrics') + Number(maxPrice !== null) + Number(query.trim().length > 0);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    let result = products.filter((product) => {
      if (category !== 'All' && !inCategory(product, category)) return false;
      if (maxPrice !== null && getProductPrice(product) > maxPrice) return false;
      const productText = `${product.title} ${product.description || ''} ${product.category} ${product.variants?.map((variant) => variant.color).join(' ') || ''}`.toLowerCase();
      if (search && !productText.includes(search)) return false;
      if (fabric !== 'All fabrics' && !(FABRIC_KEYWORDS[fabric] || []).some((keyword) => productText.includes(keyword))) return false;
      return true;
    });
    switch (sortBy) {
      case 'price-asc': result = result.sort((a, b) => getProductPrice(a) - getProductPrice(b)); break;
      case 'price-desc': result = result.sort((a, b) => getProductPrice(b) - getProductPrice(a)); break;
      case 'name-asc': result = result.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return result;
  }, [products, category, fabric, sortBy, maxPrice, query]);

  function updateUrl(nextCategory: Category, nextQuery: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory === 'All') params.delete('category');
    else params.set('category', nextCategory);
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    else params.delete('q');
    const nextSearch = params.toString();
    router.replace(`/products${nextSearch ? `?${nextSearch}` : ''}`, { scroll: false });
  }

  function chooseCategory(nextCategory: Category) {
    setCategory(nextCategory);
    updateUrl(nextCategory, query);
  }

  function resetFilters() {
    setCategory('All');
    setFabric('All fabrics');
    setMaxPrice(null);
    setQuery('');
    setSortBy('newest');
    updateUrl('All', '');
  }

  return (
    <div className="catalogue-page min-h-screen text-[#26352e]">
      <CatalogueHero title={CATEGORY_COPY[category]} categoryLabel={categoryLabel} category={category} count={categoryProducts.length} priceRange={priceRange} loading={loading} onCategoryChange={chooseCategory} />

      <section id="collection" aria-label="Shop sofas" className="catalogue-full-width w-full scroll-mt-28 px-3 py-9 sm:px-5 lg:px-5 lg:py-12">
        <div className="catalogue-layout grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
          <aside className="catalogue-sidebar self-start lg:sticky lg:top-32">
            <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="catalogue-filters" className="flex w-full items-center justify-between rounded-xl border border-[#e1e3da] bg-white/70 p-4 text-sm font-medium lg:hidden">
              <span className="flex items-center gap-2"><SlidersHorizontal size={17} />Filters {activeFilterCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#26352e] text-[10px] text-white">{activeFilterCount}</span>}</span>
              <ChevronDown size={16} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            <div id="catalogue-filters" className={`${filtersOpen ? 'block' : 'hidden'} rounded-2xl border border-[#e6e6df] bg-white/55 p-5 lg:block`}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal size={16} aria-hidden="true" />Refine your search</h2>
              </div>
              <fieldset className="border-t border-[#e6e6df] py-5">
                <legend className="sr-only">Upholstery</legend>
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-[#65745d]">Upholstery</p>
                <div className="space-y-3">
                  {FABRICS.map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-3 text-sm text-[#626e5d]">
                      <input type="radio" name="fabric" value={item} checked={fabric === item} onChange={() => setFabric(item)} className="peer sr-only" />
                      <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#65745d] peer-focus-visible:ring-offset-2 ${fabric === item ? 'border-[#65745d] bg-[#65745d] text-white' : 'border-[#d3d7cb] bg-white'}`}>{fabric === item && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}</span>
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="border-t border-[#e6e6df] py-5">
                <label htmlFor="max-price" className="mb-4 block text-xs font-medium uppercase tracking-[0.12em] text-[#65745d]">Your budget</label>
                <p className="mb-4 text-sm font-medium">{maxPrice === null ? 'Any price' : `Up to ${formatPrice(maxPrice)}`}</p>
                <input id="max-price" type="range" min={priceFloor} max={priceCeiling} step={1} value={maxPrice ?? priceCeiling} onChange={(event) => { const value = Number(event.target.value); setMaxPrice(value === priceCeiling ? null : value); }} aria-valuetext={maxPrice === null ? 'Any price' : `Up to ${formatPrice(maxPrice)}`} className="h-1.5 w-full cursor-pointer accent-[#65745d]" />
                <div className="mt-2 flex justify-between text-[11px] text-[#77806e]"><span>{formatPrice(priceFloor)}</span><span>{formatPrice(priceCeiling)}</span></div>
              </div>
              <button type="button" onClick={resetFilters} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dde1d5] px-3 py-3 text-xs font-medium transition-colors hover:bg-[#f0f2eb]"><RotateCcw size={13} aria-hidden="true" />Reset all filters</button>
            </div>
            <div className="mt-5 hidden rounded-2xl bg-[#e9ede2] p-5 lg:block">
              <Sofa size={25} strokeWidth={1.4} aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">A little help choosing?</p>
              <p className="mt-2 text-xs leading-relaxed text-[#65715d]">Let’s find the right fit for your space, style and everyday life.</p>
              <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-xs font-medium underline decoration-[#65745d]/40 underline-offset-4">Talk to our team <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="catalogue-toolbar mb-5 flex flex-wrap items-center justify-between gap-4">
              <form onSubmit={(event) => { event.preventDefault(); updateUrl(category, query); }} role="search" className="relative min-w-0 flex-1 basis-[220px]">
                <label htmlFor="catalogue-search" className="sr-only">Search sofas</label>
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7a8371]" aria-hidden="true" />
                <input id="catalogue-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sofas, fabrics or colours" className="w-full rounded-xl border border-[#e1e3da] bg-white/70 py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-[#8a9082] focus:border-[#65745d] focus:ring-2 focus:ring-[#65745d]/10" />
              </form>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="product-sort" className="sr-only">Sort products</label>
                <select id="product-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="max-w-[200px] rounded-xl border border-[#e1e3da] bg-white/70 px-3 py-3 text-xs text-[#57634f] outline-none focus:border-[#65745d] focus:ring-2 focus:ring-[#65745d]/10">
                  {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <div className="flex rounded-xl border border-[#e1e3da] bg-white/70 p-1" role="group" aria-label="Product display">
                  <button type="button" onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={`rounded-lg p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#26352e] text-white' : 'text-[#7d8475] hover:bg-[#eceee6]'}`}><LayoutGrid size={16} aria-hidden="true" /></button>
                  <button type="button" onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-[#26352e] text-white' : 'text-[#7d8475] hover:bg-[#eceee6]'}`}><List size={16} aria-hidden="true" /></button>
                </div>
              </div>
            </div>

            <div className="catalogue-result-count mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#78806f]" role="status" aria-live="polite">{loading ? 'Finding your next favourite seat…' : `${filtered.length} sofa${filtered.length === 1 ? '' : 's'} to make yourself at home`}</p>
              {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs text-[#65745d] underline underline-offset-4">Clear all filters <X size={12} aria-hidden="true" /></button>}
            </div>

            {loadError && products.length > 0 && <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e1d6bd] bg-[#f8f4e9] p-4 text-xs text-[#746343]">We could not refresh the collection. Your last results are shown.<button onClick={() => setReloadKey((key) => key + 1)} className="font-medium underline underline-offset-4">Try again</button></div>}
            {loading ? (
              <div className="flex min-h-[400px] items-center justify-center"><Spinner label="Loading sofas..." /></div>
            ) : loadError && products.length === 0 ? (
              <div className="rounded-2xl border border-[#e6e6df] bg-white/60 px-6 py-20 text-center" role="alert">
                <Sofa size={32} strokeWidth={1.3} className="mx-auto mb-5 text-[#65745d]" aria-hidden="true" />
                <h2 className="text-xl font-medium tracking-tight">Our collection is taking a moment.</h2>
                <p className="mt-3 text-sm text-[#747d6b]">We couldn’t load the sofas. Please try again.</p>
                <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#26352e] px-6 py-3 text-sm text-white transition-colors hover:bg-[#465841]"><RotateCcw size={15} aria-hidden="true" />Try again</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-[#e6e6df] bg-white/60 px-6 py-20 text-center">
                <Search size={30} strokeWidth={1.4} className="mx-auto mb-5 text-[#65745d]" aria-hidden="true" />
                <h2 className="text-xl font-medium tracking-tight">No sofas found just yet.</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#747d6b]">Try another search or give your filters a little more room.</p>
                <button type="button" onClick={resetFilters} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#26352e] px-6 py-3 text-sm text-white transition-colors hover:bg-[#465841]">Explore all sofas <ArrowRight size={15} aria-hidden="true" /></button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'catalogue-sofa-grid' : 'space-y-5'}>
                {filtered.slice(0, visibleCount).map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    category={product.category}
                    image={product.images[0] || '/placeholder.svg'}
                    newPrice={getProductPrice(product)}
                    oldPrice={product.compare_at_price}
                    variants={product.variants}
                    layout={viewMode}
                    description={product.description}
                    priceType={product.price_type}
                  />
                ))}
              </div>
            )}
            {!loading && filtered.length > visibleCount && <div className="catalogue-load-more mt-9 text-center"><p className="mb-3 text-sm">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} products</p><button type="button" className="min-h-12 rounded-full border border-current px-8 py-3 text-sm font-medium" onClick={() => setVisibleCount(count => count + 12)}>Show more products</button></div>}
          </div>
        </div>
      </section>
    </div>
  );
}
