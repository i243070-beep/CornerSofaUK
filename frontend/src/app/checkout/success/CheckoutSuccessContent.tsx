'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { LocalOrder } from '@/lib/local-orders';
import OrderConfirmation from '@/components/OrderConfirmation';

export default function CheckoutSuccessContent() {
  const params = useSearchParams();
  const id = params.get('order_id');
  const [order, setOrder] = useState<LocalOrder>();
  useEffect(() => {
    setOrder(undefined);
    if (!id) return;
    try {
      const saved = sessionStorage.getItem('sofa-order-' + id);
      if (saved) {
        const receipt = JSON.parse(saved);
        if (receipt.id === id && Array.isArray(receipt.lines)) setOrder(receipt);
      }
    } catch {}
  }, [id]);
  if (order) return <OrderConfirmation order={order} />;
  return <section className="max-w-xl mx-auto py-20 px-5 text-center"><h1 className="text-3xl mb-4">Your order confirmation</h1><p className="text-sm leading-7 mb-6">Confirm your order from checkout to receive an order reference. If you have already ordered, contact us for help with your order.</p><Link href="/contact" className="underline mr-6">Contact us</Link><Link href="/cart" className="underline">View basket</Link></section>;
}
