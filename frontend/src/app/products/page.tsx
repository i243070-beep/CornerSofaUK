import { Suspense } from 'react';
import { listProducts } from '@/lib/product-store';
import ProductsClient from './ProductsClient';
import { Spinner } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await listProducts().catch(() => undefined);
  return (
    <Suspense
      fallback={
        <div className="min-h-[600px] flex items-center justify-center bg-primary">
          <Spinner label="Loading products..." />
        </div>
      }
    >
      <ProductsClient initialProducts={products} />
    </Suspense>
  );
}
