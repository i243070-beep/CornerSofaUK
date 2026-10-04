'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { ensureLocalProductImages } from '@/lib/product-images';
import { getProductPrice, type StoreProduct } from '@/lib/product-options';

export default function HomeProductSections({ initialProducts }: { initialProducts?: StoreProduct[] }) {
  const [products, setProducts] = useState<StoreProduct[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products/', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load products');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid catalogue');
      setProducts(data.map(ensureLocalProductImages));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialProducts) loadProducts();
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('corner-sofa-products') : null;
    channel?.addEventListener('message', loadProducts);
    window.addEventListener('focus', loadProducts);
    return () => {
      channel?.close();
      window.removeEventListener('focus', loadProducts);
    };
  }, [loadProducts, initialProducts]);

  const visible = products.slice(0, 3);

  return (
    <section className="reference-collections" aria-labelledby="home-collections-title">
      <div className="reference-collections-heading">
        <div>
          <h2 id="home-collections-title">Our Collections</h2>
          <p>Discover sofas crafted for comfort, style, and everyday living. Open Products to explore every sofa category.</p>
        </div>
        <div className="reference-collection-controls" aria-hidden="true"><ChevronLeft size={17} /><ChevronRight size={17} /></div>
      </div>

      {loading ? (
        <div className="featured-grid" aria-label="Loading sofa collection" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div className="product-skeleton" key={index}><div /><span /><span /></div>)}</div>
      ) : error ? (
        <div className="collection-empty"><p>We couldn&apos;t load the collection. Please try again.</p><button onClick={() => { setLoading(true); loadProducts(); }} className="text-link"><RefreshCw size={17} /> Retry</button></div>
      ) : (
        <div className="featured-grid">{visible.map(product => <ProductCard key={product.id} id={product.id} title={product.title} category={product.category} description={product.description} image={product.images?.[0] || '/placeholder.svg'} newPrice={getProductPrice(product)} oldPrice={product.compare_at_price} variants={product.variants} />)}</div>
      )}

      <Link href="/products" className="reference-view-all">View all products <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
  );
}
