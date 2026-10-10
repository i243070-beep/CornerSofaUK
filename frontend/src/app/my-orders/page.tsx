'use client';
import { readApiJson } from '@/lib/api-json';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Box, CalendarDays, Clock3, RefreshCw, Truck } from 'lucide-react';
import { formatProductPrice } from '@/lib/product-options';
import { readSavedOrders, type SavedOrderAccess } from '@/lib/order-tracking';
import OrderProgress from '@/components/OrderProgress';
import OrderReference from '@/components/OrderReference';

type TrackedOrder = {
  id: string; customer: string; date: string; status: string; deliveryDate?: string; deliveryTime?: string; sofaDetails?: string;
  deliveryOption?: string; deliveryCost?: number; assemblyFloor?: 'ground' | 'first'; assemblyCost?: number; subtotal?: number; total: number; postcode?: string;
  lines: Array<{ title: string; color: string; quantity: number; price: number; type?: string; range_type?: string; image?: string }>;
};

export default function MyOrdersPage() {
  const [access, setAccess] = useState<SavedOrderAccess[]>([]);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (saved = access) => {
    if (!saved.length) { setOrders([]); setLoading(false); return; }
    try {
      const response = await fetch('/api/order-tracking/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ tokens: saved.map(item => item.token) }) });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.error || 'Your orders could not be loaded.');
      setOrders(Array.isArray(result.orders) ? result.orders : []);
      setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your orders could not be loaded.'); }
    finally { setLoading(false); }
  }, [access]);

  useEffect(() => {
    const saved = readSavedOrders();
    setAccess(saved);
    void refresh(saved);
    const update = () => { const current = readSavedOrders(); setAccess(current); void refresh(current); };
    window.addEventListener('focus', update);
    const timer = window.setInterval(update, 30000);
    return () => { window.removeEventListener('focus', update); window.clearInterval(timer); };
  }, []); // Load this browser’s private order keys once; the 30 second check picks up admin approval.

  return <main className="min-h-[70vh] bg-[#f2f4ef] px-4 py-10 text-[#283b30] sm:px-6 sm:py-14">
    <div className="mx-auto max-w-5xl">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#1e3329] via-[#293d30] to-[#5b4326] px-6 py-8 text-white shadow-[0_22px_70px_rgba(28,42,32,.18)] sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full border border-white/10" /><div className="pointer-events-none absolute -right-5 -top-12 h-44 w-44 rounded-full border border-[#e6bf75]/20" />
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f1d59b]/35 bg-[#f2c778]/15 text-[#f2d293]"><Truck size={24} /></span>
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#f0ce8b]">Your Corner Sofa deliveries</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-4xl sm:text-5xl">On their way home.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Your orders appear here automatically. Once our team approves an order, its delivery date and time will show here.</p></div><button type="button" onClick={() => { setLoading(true); void refresh(access); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-medium hover:bg-white/15"><RefreshCw size={14} />Refresh</button></div>
      </section>

      <div className="mt-6 space-y-5">
        {loading && <section role="status" className="rounded-3xl border border-[#dce3d8] bg-white p-8 text-center text-sm text-[#687563]">Loading your orders…</section>}
        {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {!loading && !error && !orders.length && <section className="rounded-3xl border border-[#dce3d8] bg-white px-6 py-12 text-center shadow-sm"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2e8] text-[#536b4a]"><Box size={26} /></span><h2 className="font-serif text-2xl">Your next favourite seat starts here.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667260]">Orders you confirm on this device will appear here automatically. You won’t need an order number or postcode to check delivery progress.</p><Link href="/products" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#284236] px-6 text-sm font-semibold text-white">Find your sofa <ArrowRight size={16} /></Link></section>}
        {orders.map(order => <article key={order.id} className="overflow-hidden rounded-[28px] border border-[#dce3d8] bg-white shadow-[0_14px_44px_rgba(36,54,42,.07)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e9e2] bg-gradient-to-r from-[#fbfaf6] to-[#eff2e9] px-5 py-5 sm:px-7"><div><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.2em] text-[#8a704c]">Your order number · for queries</p><OrderReference id={order.id} /></div><p className="text-xs text-[#6d7868]">Placed {new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
          <div className="space-y-5 p-5 sm:p-7"><OrderProgress status={order.status} />
            <div className={`rounded-2xl border p-4 ${order.deliveryDate ? 'border-[#d7e3cf] bg-gradient-to-r from-[#edf4e8] to-[#f7f5e9]' : 'border-[#e9dfca] bg-gradient-to-r from-[#fbf7ed] to-[#f2f1e9]'}`}>
              {order.deliveryDate ? <><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-[#64725b]"><CalendarDays size={15} className="text-[#748d62]" />Delivery scheduled</p><p className="mt-2 font-serif text-xl">{new Date(`${order.deliveryDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>{order.deliveryTime && <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5f6f5a]"><Clock3 size={14} />{order.deliveryTime}</p>}</> : <><p className="text-sm font-semibold text-[#465943]">Your order has been received</p><p className="mt-1 text-xs leading-5 text-[#667260]">Your delivery date will appear here once the delivery team approves your order.</p></>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-3">{order.lines.filter(line => line.type !== 'swatch').map((line, index) => <div key={`${line.title}-${index}`} className="flex gap-3 rounded-2xl border border-[#e4e9e1] p-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f1f3ee]">{line.image && <img src={line.image} alt="" className="h-full w-full object-contain" />}</div><div className="min-w-0 self-center"><strong className="block text-sm">{line.title}</strong><p className="mt-1 text-xs text-[#6a7765]">{line.range_type} · {line.color} · Qty {line.quantity}</p><p className="mt-1 text-xs">{formatProductPrice(line.price * line.quantity)}</p></div></div>)}</div><div className="rounded-2xl bg-[#f5f6f2] p-4"><h2 className="mb-3 font-serif text-xl">Your delivery</h2><p className="text-sm">{order.deliveryOption || 'Standard UK delivery'}<br />{order.assemblyFloor === 'first' ? 'First-floor assembly' : 'Ground-floor assembly'}<br />{order.postcode}</p><dl className="mt-4 space-y-2 border-t border-[#dfe5db] pt-3 text-xs"><div className="flex justify-between gap-3"><dt>Delivery</dt><dd>{order.deliveryCost ? formatProductPrice(order.deliveryCost) : 'Free'}</dd></div><div className="flex justify-between gap-3"><dt>Assembly</dt><dd>{order.assemblyCost ? formatProductPrice(order.assemblyCost) : 'Free'}</dd></div><div className="flex justify-between gap-3 border-t border-[#dfe5db] pt-2 font-semibold"><dt>Due on delivery</dt><dd>{formatProductPrice(order.total)}</dd></div></dl>{order.sofaDetails && <p className="mt-3 text-xs leading-5 text-[#667260]">{order.sofaDetails}</p>}</div></div>
          </div>
        </article>)}
      </div>
    </div>
  </main>;
}
