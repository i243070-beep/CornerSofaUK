'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

export default function MiniCart() {
  const { items, total, itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function handlePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function closeBasket() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#26352e] bg-[#26352e] text-white shadow-sm hover:border-[#17251d] hover:bg-[#17251d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#526449] motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-200 sm:w-auto sm:pl-4 sm:pr-2.5"
        aria-label={`Open basket, ${itemCount} item${itemCount === 1 ? '' : 's'}, ${formatPrice(total)}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
      >
        <ShoppingBag size={21} strokeWidth={1.6} aria-hidden="true" />
        <span className="hidden text-sm font-medium sm:inline">Basket</span>
        <span className="hidden text-sm font-semibold tabular-nums text-[#f4d6ad] md:inline">{formatPrice(total)}</span>
        <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#e8eddf] px-1 text-[9px] font-semibold leading-4 text-[#344536] ring-2 ring-[#faf9f6] sm:static sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-xs sm:ring-0">
          {itemCount}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Your basket"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="absolute -right-12 top-full z-50 mt-4 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[24px] border border-white/80 bg-[#fafbf7]/95 shadow-[0_20px_80px_rgba(31,44,31,0.18)] backdrop-blur-2xl sm:right-0"
          >
            <div className="flex items-center justify-between border-b border-[#28352c]/10 px-6 py-4">
              <p className="text-base font-semibold text-[#28352c]">Your basket <span className="ml-1 text-sm font-normal text-[#6a7167]">({itemCount})</span></p>
              <button ref={closeRef} type="button" onClick={closeBasket} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-[#5d685b] transition-colors hover:bg-black/5" aria-label="Close basket">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="px-7 py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e9ede4] text-[#526449]"><ShoppingBag size={23} strokeWidth={1.5} aria-hidden="true" /></div>
                <p className="text-lg font-medium text-[#28352c]">Make room for comfort.</p>
                <p className="mb-6 mt-2 text-sm leading-relaxed text-[#6a7167]">Your basket is empty. Find a sofa you&apos;ll love coming home to.</p>
                <Link href="/products" onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center gap-3 rounded-full bg-[#344536] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#243326]">
                  Explore our sofas <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <>
                <div className="max-h-[45vh] overflow-y-auto px-6">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3 border-b border-[#28352c]/10 py-4 last:border-0">
                      <div className="h-[68px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-[#eeeee7]">
                        <Image src={item.image} alt={item.title} width={76} height={68} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#28352c]">{item.title}</p>
                        <p className="mt-1 text-xs text-[#6a7167]">{item.color} &middot; Qty {item.quantity}</p>
                        <p className="mt-1.5 text-sm font-medium text-[#28352c]">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#28352c]/10 bg-[#eef0e8]/70 p-6">
                  <div className="mb-5 flex items-center justify-between text-sm text-[#28352c]">
                    <span>Subtotal</span><span className="text-lg font-semibold">{formatPrice(total)}</span>
                  </div>
                  <p className="mb-4 text-center text-xs text-[#526649]">Pay on delivery. No online payment needed.</p>
                  <Link href={items.some(item => item.offerToken) ? "/alashi-checkout/" : "/checkout"} onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center gap-3 rounded-full bg-[#344536] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#243326]">Order — pay on delivery <ArrowRight size={16} aria-hidden="true" /></Link>
                  <Link href="/cart" onClick={() => setOpen(false)} className="mt-2 flex min-h-11 items-center justify-center rounded-full text-sm font-medium text-[#344536] underline decoration-[#344536]/30 underline-offset-4 transition-colors hover:bg-white/70">View your basket</Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
