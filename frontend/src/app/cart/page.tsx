'use client';

import BuildSpecification from '@/components/sofa-builder/BuildSpecification';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Armchair, Check, LockKeyhole, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

export default function CartPage() {
  const { items, total, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const reduceMotion = useReducedMotion();
  const hasSofa = items.some((item) => item.itemType !== 'swatch');

  if (items.length === 0) {
    return (
      <section className="flex min-h-[600px] flex-col items-center justify-center bg-[#faf9f6] px-5 py-20 text-center text-[#28352c]">
        <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.35 }} className="w-full max-w-lg">
          <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-[34px] border border-white bg-[#e9ece2] shadow-[0_16px_50px_rgba(40,53,44,0.06)]">
            <Armchair size={49} strokeWidth={1.3} className="text-[#667456]" aria-hidden="true" />
            <span className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#faf9f6] bg-[#344536] text-white"><ShoppingBag size={17} strokeWidth={1.5} aria-hidden="true" /></span>
          </div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.23em] text-[#7c856f]">A little room for something lovely</p>
          <h1 className="text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Your basket is empty.</h1>
          <p className="mx-auto mb-8 mt-5 max-w-sm text-sm leading-7 text-[#71776a]">A softer landing, a favourite corner, a place to put your feet up. Find the sofa that feels like you.</p>
          <Link href="/products" className="inline-flex min-h-12 items-center justify-center gap-4 rounded-full bg-[#344536] px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#243326]">
            Find your sofa <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/swatches" className="mx-auto mt-3 flex min-h-11 w-fit items-center px-4 text-xs text-[#667456] underline decoration-[#667456]/35 underline-offset-4">Choose your sofa fabric</Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="commerce-studio commerce-basket bg-[#faf9f6] px-5 py-9 text-[#28352c] sm:px-8 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-[1280px]">
        <Link href="/products" className="mb-8 inline-flex min-h-10 items-center gap-2 text-xs text-[#727a69] transition-colors hover:text-[#28352c]"><ArrowLeft size={15} aria-hidden="true" />Continue shopping</Link>
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4 sm:mb-11">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c856f]">Comfort, coming home</p>
            <h1 className="text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Your basket<span className="ml-3 align-top text-xl font-normal tracking-normal text-[#8b927e]">({itemCount})</span></h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#727a69]"><LockKeyhole size={15} strokeWidth={1.6} aria-hidden="true" />Secure checkout</div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <div>
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-[#e2e6d9] bg-[#eef1e8] px-4 py-3 text-xs leading-relaxed text-[#58664c]"><Check size={17} className="shrink-0" aria-hidden="true" />Lovely choice. Free standard UK delivery is included.</div>
            <ul className="space-y-4" aria-label="Basket items">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={`${item.productId}-${item.variantId}`}
                    layout={!reduceMotion}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="rounded-[24px] border border-[#e6e8df] bg-white/75 p-4 shadow-[0_5px_25px_rgba(40,53,44,0.025)] sm:p-5"
                  >
                    <div className="flex gap-4 sm:gap-6">
                      <div className="relative h-[120px] w-[108px] shrink-0 overflow-hidden rounded-2xl bg-[#f0f0e9] sm:h-[150px] sm:w-[180px]">
                        <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 108px, 180px" className="object-contain" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col py-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="break-words text-base font-medium leading-snug tracking-[-0.02em] sm:text-xl">{item.title}</h2>
                            <p className="mt-1.5 text-xs leading-relaxed text-[#78806f]">{item.range_type}</p>
                            <p className="mt-1 text-xs leading-relaxed text-[#78806f]">{item.color}</p>{item.buildSnapshot && <><BuildSpecification build={item.buildSnapshot} compact /><Link href={`/build/?build=${item.buildId}&edit=${encodeURIComponent(item.variantId)}`} className="mt-2 inline-block text-xs font-semibold underline">Edit my configuration</Link><p className="mt-2 text-xs">Delivery and services are calculated once at checkout.</p></>}
                          </div>
                          <button type="button" onClick={() => removeItem(item.productId, item.variantId)} className="-mr-2 -mt-2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#858a7d] transition-colors hover:bg-[#f4e9e5] hover:text-[#a45f48] sm:flex" aria-label={`Remove ${item.title} in ${item.color} from basket`}><Trash2 size={17} strokeWidth={1.5} aria-hidden="true" /></button>
                        </div>
                        <p className="mt-auto pt-3 text-base font-medium sm:hidden">{formatPrice(item.price * item.quantity)}</p>
                        <div className="mt-auto hidden items-end justify-between gap-3 pt-5 sm:flex">
                          <div className="inline-flex items-center rounded-full border border-[#dfe3d7] bg-[#fafbf7]" role="group" aria-label={`Quantity for ${item.title} in ${item.color}`}>
                            <button type="button" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} disabled={item.quantity <= 1} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[#e9ece2] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Decrease quantity of ${item.title} in ${item.color}`}><Minus size={15} aria-hidden="true" /></button>
                            <span className="w-7 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[#e9ece2]" aria-label={`Increase quantity of ${item.title} in ${item.color}`}><Plus size={15} aria-hidden="true" /></button>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                            {item.quantity > 1 && <p className="mt-0.5 text-[10px] text-[#7b8273]">{formatPrice(item.price)} each</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#e6e8df] pt-4 sm:hidden">
                      <button type="button" onClick={() => removeItem(item.productId, item.variantId)} className="flex min-h-11 items-center gap-2 text-xs text-[#858a7d] transition-colors hover:text-[#a45f48]" aria-label={`Remove ${item.title} in ${item.color} from basket`}><Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />Remove</button>
                      <div className="inline-flex items-center rounded-full border border-[#dfe3d7] bg-[#fafbf7]" role="group" aria-label={`Quantity for ${item.title} in ${item.color}`}>
                        <button type="button" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} disabled={item.quantity <= 1} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[#e9ece2] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Decrease quantity of ${item.title} in ${item.color}`}><Minus size={15} aria-hidden="true" /></button>
                        <span className="w-7 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[#e9ece2]" aria-label={`Increase quantity of ${item.title} in ${item.color}`}><Plus size={15} aria-hidden="true" /></button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#858b7b]">Made to be part of your everyday.</p>
              <button type="button" onClick={clearCart} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-2 text-xs text-[#858b7b] transition-colors hover:text-[#a45f48]"><Trash2 size={13} aria-hidden="true" />Clear basket</button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-[150px]" aria-labelledby="order-summary-heading">
            <div className="overflow-hidden rounded-[28px] border border-white bg-[#eff1e8]/80 p-6 shadow-[0_10px_40px_rgba(40,53,44,0.045)] backdrop-blur-xl sm:p-7">
              <h2 id="order-summary-heading" className="mb-7 text-xl font-medium tracking-[-0.025em]">Order summary</h2>
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-[#737d66]">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</dt><dd className="font-medium tabular-nums">{formatPrice(total)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#737d66]">Standard delivery</dt><dd className="font-medium text-[#526649]">Free</dd></div>
                <div className="flex items-center justify-between gap-3 border-t border-[#d8dece] pt-5"><dt className="font-medium">Total</dt><dd className="text-2xl font-medium tracking-[-0.04em] tabular-nums" aria-live="polite" aria-atomic="true">{formatPrice(total)}</dd></div>
              </dl>
              <p className="mb-6 mt-2 text-[11px] leading-relaxed text-[#7b8570]">Additional delivery options at checkout.</p>
              {hasSofa ? <Link href="/checkout/" className="flex min-h-[52px] items-center justify-center gap-4 rounded-full bg-[#344536] px-5 py-3.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(40,53,44,0.1)] transition-colors hover:bg-[#243326]">Continue to checkout <ArrowRight size={17} aria-hidden="true" /></Link> : <div className="rounded-2xl border border-[#ead9c8] bg-[#fff8ef] px-4 py-3 text-xs leading-relaxed text-[#8c684d]">Add a sofa to your basket before checkout. Fabric swatches cannot be purchased alone.</div>}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#7b8570]"><Check size={14} strokeWidth={1.5} aria-hidden="true" />Pay on delivery. No online payment needed.</p>
            </div>
            <div className="space-y-4 px-5 py-7">
              <div className="flex items-start gap-3"><Truck size={19} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#718063]" aria-hidden="true" /><div><p className="text-xs font-medium">Delivered with care</p><p className="mt-1 text-[11px] leading-relaxed text-[#838a79]">Free standard delivery to your room of choice.</p></div></div>
              <div className="flex items-start gap-3"><ShieldCheck size={19} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#718063]" aria-hidden="true" /><div><p className="text-xs font-medium">Made for the long run</p><p className="mt-1 text-[11px] leading-relaxed text-[#838a79]">Handmade in Britain. 10-year warranty.</p></div></div>
            </div>
            <p className="border-t border-[#e2e6d9] px-5 pt-5 text-xs leading-relaxed text-[#838a79]">Need a hand? <Link href="/contact" className="font-medium text-[#526449] underline decoration-[#526449]/30 underline-offset-4">We&apos;re here to help.</Link></p>
          </aside>
        </div>
      </div>
    </section>
  );
}
