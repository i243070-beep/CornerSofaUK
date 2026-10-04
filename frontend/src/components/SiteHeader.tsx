'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Heart, Layers3, Phone, Search, Sofa, Truck, X } from 'lucide-react';
import MiniCart from './MiniCart';
import MobileMenu from './MobileMenu';
import ProductNavigation from './ProductNavigation';

export default function SiteHeader({ catalogue = false }: { catalogue?: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  useEffect(() => { setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        searchButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [searchOpen]);

  return (
    <header className="site-header sticky top-0 z-50 border-b border-[#28352c]/10 bg-[#faf9f6]/90 text-[#28352c] backdrop-blur-2xl">
      <div className="border-b border-white/10 bg-[#344536] text-[#f7f7ef]">
        <div className="mx-auto flex min-h-[42px] max-w-[1500px] items-center justify-center gap-4 px-5 py-1.5 text-[11px] tracking-[0.025em] sm:justify-between sm:px-8 lg:px-12">
          <a href="tel:+447456439050" className="hidden shrink-0 items-center gap-2 text-white/90 sm:flex"><Phone size={14} strokeWidth={1.5} />+44 7456 439050</a>
          <p className="text-center font-medium">Handmade in Britain · Free UK delivery</p>
          <div className="hidden shrink-0 items-center gap-4 lg:flex"><Link href="/my-orders" className="inline-flex items-center gap-1.5 hover:text-white"><Truck size={14} />My orders</Link><Link href="/reviews" className="inline-flex items-center gap-1.5 hover:text-white"><Heart size={14} />Feedback</Link></div>
        </div>
      </div>
      <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between gap-2 px-4 sm:gap-3 sm:px-8 lg:h-[84px] lg:px-12">
        <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl text-[#28352c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#526449] sm:gap-3" aria-label="Sofa home">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/90 bg-gradient-to-br from-white via-[#f0f3e9] to-[#dce5cc] text-[#344536] shadow-[0_3px_12px_rgba(52,69,54,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#344536]/10 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-0.5 sm:h-[52px] sm:w-[52px] sm:rounded-[18px]">
            <Sofa className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.4} />
          </span>
          <span className="flex flex-col items-start gap-1.5">
            <span className="font-serif text-[36px] leading-[0.9] tracking-[-0.055em] sm:text-[42px]">Sofa</span>
            <span aria-hidden="true" className="h-0.5 w-8 origin-left rounded-full bg-gradient-to-r from-[#788a65] to-[#c7d7ad] motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-x-125 sm:w-10" />
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 lg:justify-center">
          <ProductNavigation />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/room-planner/" aria-label="Plan my room" className="hidden h-11 items-center gap-2 rounded-full border border-[#d6ddcc] bg-white/70 px-3 text-xs font-medium transition-colors hover:bg-[#e9ece4] xl:flex"><Layers3 size={18} />Plan room</Link>
          <Link href="/reviews" aria-label={catalogue ? 'Reviews' : 'Customer feedback'} className="hidden h-11 w-11 items-center justify-center rounded-full border border-[#d6ddcc] bg-white/70 transition-colors hover:bg-[#e9ece4] sm:flex"><Heart size={19} />{catalogue && <span>Reviews</span>}</Link>
          <button ref={searchButtonRef} type="button" onClick={() => setSearchOpen(!searchOpen)} aria-label={searchOpen ? 'Close search' : 'Search sofas'} aria-expanded={searchOpen} aria-controls={searchId} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d6ddcc] bg-white/70 transition-colors hover:bg-[#e9ece4]">
            {searchOpen ? <X size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
          </button>
          <MiniCart />
          <MobileMenu />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div id={searchId} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="overflow-hidden border-t border-[#28352c]/10 bg-[#faf9f6]/95">
            <form
              action="/products"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const query = String(new FormData(event.currentTarget).get('q') ?? '').trim();
                if (!query) {
                  searchInputRef.current?.focus();
                  return;
                }
                router.push(`/products?q=${encodeURIComponent(query)}`);
                setSearchOpen(false);
              }}
              className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-5 sm:px-8"
            >
              <Search size={21} strokeWidth={1.5} className="shrink-0 text-[#6a7561]" aria-hidden="true" />
              <label htmlFor={`${searchId}-input`} className="sr-only">Search sofas by name, style or colour</label>
              <input ref={searchInputRef} id={`${searchId}-input`} type="search" name="q" placeholder="Find your sofa. Try ‘corner’ or ‘velvet’" required autoComplete="off" className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-[#28352c] outline-none placeholder:text-[#7a8275] focus:ring-0" />
              <button type="submit" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#344536] text-white transition-colors hover:bg-[#243326]" aria-label="Search"><ArrowRight size={19} aria-hidden="true" /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
