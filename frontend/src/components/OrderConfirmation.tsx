import BuildSpecification from './sofa-builder/BuildSpecification';
import Link from 'next/link';
import { CheckCircle2, Clock3 } from 'lucide-react';
import type { LocalOrder } from '@/lib/local-orders';
import { formatProductPrice } from '@/lib/product-options';
import OrderProgress from '@/components/OrderProgress';
import OrderReference from '@/components/OrderReference';

export default function OrderConfirmation({ order }: { order: LocalOrder }) {
  return <section className="mx-auto max-w-4xl px-4 py-10 text-[#283b30] sm:px-6 sm:py-14">
    <div className="overflow-hidden rounded-[30px] border border-[#dfe5d9] bg-white shadow-[0_24px_75px_rgba(37,55,42,.12)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#20372c] via-[#293d30] to-[#523e24] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" /><div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border border-[#e5bd72]/20" />
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f1d59b]/35 bg-[#f2c778]/15 text-[#f2d293]"><CheckCircle2 size={25} /></span>
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#f0ce8b]">A good choice deserves good care</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Your order is with us.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Thanks, {order.customer}. Your order has been received. Our delivery team will add your delivery date and time after they approve it.</p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/15 bg-black/10 p-4 sm:p-5">
          <div><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.2em] text-white/55">Order number · for your records and queries</p><OrderReference id={order.id} /></div>
          <p className="flex items-center gap-2 text-xs text-white/70"><Clock3 size={15} className="text-[#f0ce8b]" />Awaiting delivery approval</p>
        </div>
      </div>
      <div className="space-y-7 p-5 sm:p-9">
        <OrderProgress status={order.status} />
        <div className="rounded-2xl border border-[#eadfca] bg-gradient-to-r from-[#fbf7ed] to-[#f0f3e8] p-4 sm:p-5"><p className="font-semibold text-[#354938]">Cash on delivery · £0 paid online</p><p className="mt-1 text-sm text-[#667260]">Amount due when your sofa arrives: <strong className="text-[#344536]">{formatProductPrice(order.total)}</strong></p></div>
        <div><h2 className="mb-3 font-serif text-2xl">Your sofa</h2><div className="divide-y divide-[#e7ebe4] rounded-2xl border border-[#e0e6dc] px-4">{order.lines.filter(line => line.type !== 'swatch').map((line, index) => <div key={`${line.productId || line.title}-${index}`} className="flex justify-between gap-4 py-4 text-sm"><span className="min-w-0"><strong className="block">{line.title}</strong><small className="text-[#697664]">{line.range_type} · {line.color} · Quantity {line.quantity}</small></span><b className="shrink-0">{formatProductPrice(line.price * line.quantity)}</b></div>)}</div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f4f6f1] p-4 text-sm leading-6"><h2 className="mb-2 font-semibold">Delivery address</h2><p>{order.customer}<br />{order.address}<br />{order.city}<br />{order.postcode}</p><p className="mt-2 text-xs text-[#697664]">{order.deliveryOption || 'Standard UK delivery'} · {order.assemblyFloor === 'first' ? 'First floor assembly' : 'Ground floor assembly'}</p></div><div className="rounded-2xl bg-[#f4f6f1] p-4 text-sm leading-6"><h2 className="mb-2 font-semibold">Delivery details</h2><p>Preference: {order.requestedDeliveryDate || "As soon as possible"}</p>{order.deliveryInstructions && <p className="whitespace-pre-wrap">Instructions: {order.deliveryInstructions}</p>}{order.deliveryDate ? <p className="font-semibold text-[#344536]">{new Date(`${order.deliveryDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{order.deliveryTime && <><br />{order.deliveryTime}</>}</p> : <p className="text-[#697664]">Our delivery team will share a date and time when your order is approved.</p>}<p className="mt-3 text-xs text-[#697664]">Questions? Give our team your six-character order number.</p></div></div>
        {order.lines.filter(line=>line.buildSnapshot).map((line,index)=><BuildSpecification key={index} build={line.buildSnapshot!} compact />)}<dl className="ml-auto max-w-sm space-y-2 border-t border-[#e3e8df] pt-4 text-sm"><div className="flex justify-between gap-4"><dt>Sofa subtotal</dt><dd>{formatProductPrice(order.subtotal ?? order.total - (order.deliveryCost || 0) - (order.assemblyCost || 0) - (order.removalCost || 0))}</dd></div><div className="flex justify-between gap-4"><dt>Delivery</dt><dd>{order.deliveryCost ? formatProductPrice(order.deliveryCost) : 'Free'}</dd></div><div className="flex justify-between gap-4"><dt>{order.assemblyFloor === 'first' ? 'First-floor assembly' : 'Ground-floor assembly'}</dt><dd>{order.assemblyCost ? formatProductPrice(order.assemblyCost) : 'Free'}</dd></div><div className="flex justify-between gap-4"><dt>Old-sofa removal</dt><dd>{order.removeOldSofa ? formatProductPrice(order.removalCost || 0) : "Not requested"}</dd></div><div className="flex justify-between gap-4 border-t border-[#e3e8df] pt-3 font-semibold"><dt>Total due on delivery</dt><dd>{formatProductPrice(order.total)}</dd></div></dl>
        <div className="flex flex-wrap gap-3"><Link href="/my-orders" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#284236] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d3228]">View my deliveries</Link><Link href="/products" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d8dfd3] px-6 text-sm font-medium text-[#344536] transition hover:bg-[#f3f5f0]">Continue shopping</Link></div>
      </div>
    </div>
  </section>;
}
