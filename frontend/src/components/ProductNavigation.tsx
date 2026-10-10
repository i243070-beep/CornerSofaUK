'use client';
import { readApiJson } from '@/lib/api-json';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ArrowUpRight, ChevronDown, Palette, X } from 'lucide-react';
import { SHOP_CATEGORIES, categoryHref } from '@/lib/shop-navigation';
import { inCategory } from '@/lib/product-categories';
import { formatProductPrice, getProductPrice, type StoreProduct } from '@/lib/product-options';
import styles from './ProductNavigation.module.css';
import MiniCart from './MiniCart';
import DeliveryAvailability from './DeliveryAvailability';

export default function ProductNavigation({ home = false, separateActions = false }: { home?: boolean; separateActions?: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [top, setTop] = useState(100);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pathname = usePathname();
  const selected = SHOP_CATEGORIES[active];
  const matches = products.filter(product => inCategory(product, selected.category));
  const prices = matches.map(getProductPrice);
  const close = () => { dialog.current?.close(); setOpen(false); };

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/products/', { signal: controller.signal }).then(response => response.ok ? readApiJson(response) : []).then(data => { if (Array.isArray(data)) setProducts(data); }).catch(() => {});
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { controller.abort(); document.body.style.overflow = previous; };
  }, [open]);

  function showProducts() {
    const bottom = trigger.current?.closest('header')?.getBoundingClientRect().bottom || 90;
    setTop(window.innerWidth < 761 ? 12 : Math.min(160, Math.max(72, bottom + 12)));
    setOpen(true);
  }

  return <>
    <nav aria-label={home ? 'Homepage navigation' : 'Main navigation'} className={`${styles.pill} ${home ? styles.home : ''}`}>
      <Link href="/" aria-current={pathname === '/' && !open ? 'page' : undefined}>Home</Link>
      <button ref={trigger} type="button" onMouseEnter={() => { if (pathname === '/' && window.matchMedia('(hover: hover)').matches) showProducts(); }} onClick={showProducts} aria-expanded={open} aria-controls={id} aria-haspopup="dialog" className={open || pathname.startsWith('/product') ? styles.active : ''}>Products <span className={styles.arrowTarget} onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) showProducts(); }}><ChevronDown size={13} aria-hidden="true" /></span></button>
      <Link href="/swatches/" aria-current={pathname.startsWith('/swatches') ? 'page' : undefined}><Palette size={15} aria-hidden="true" />Swatches</Link>
      {home && <>{!separateActions && <Link href="/room-planner/">Plan Room</Link>}<Link href="/build" aria-current={pathname.startsWith("/build")?"page":undefined}>Build</Link></>}
      {!home && <Link href="/build">Build</Link>}
      <Link href="/contact" aria-current={pathname.startsWith('/contact') ? 'page' : undefined}>Contact</Link>
      <Link href="/about" aria-current={pathname.startsWith('/about') ? 'page' : undefined}>About</Link>
      {home && <><Link href="/reviews">Reviews</Link><DeliveryAvailability />{!separateActions && <><div className={styles.basket}><MiniCart /></div><Link href="/my-orders">My orders</Link></>}</>}
    </nav>
    {open && createPortal(<dialog ref={dialog} id={id} aria-labelledby={`${id}-title`} className={styles.dialog} style={{ top, maxHeight: `calc(100dvh - ${top + 16}px)` }} onCancel={close} onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.panel}>
        <div className={styles.heading}><div><p>Find your kind of comfort</p><h2 id={`${id}-title`}>The sofa collection</h2></div><button type="button" autoFocus onClick={close} aria-label="Close product menu"><X size={22} /></button></div>
        <div className={styles.columns}>
          <nav aria-label="Product categories" className={styles.categories}>
            <p className={styles.eyebrow}>Shop by shape</p>
            {SHOP_CATEGORIES.map((item, index) => <Link key={item.category} href={categoryHref(item.category)} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={close} className={active === index ? styles.selected : ''}>{item.label}<ArrowUpRight size={20} aria-hidden="true" /></Link>)}
          </nav>
          <div className={styles.ranges}><p className={styles.eyebrow}>Explore the range</p><h3>{selected.label}</h3><nav aria-label={`${selected.label} ranges`}>{selected.families.map(family => <Link key={family} onClick={close} href={`${categoryHref(selected.category)}&q=${encodeURIComponent(family)}`}>{family}<ArrowRight size={15} aria-hidden="true" /></Link>)}</nav><Link href="/products" className={styles.shopAll} onClick={close}>Shop all sofas <ArrowUpRight size={17} /></Link></div>
          <Link href={categoryHref(selected.category)} className={styles.preview} onClick={close}><img src={selected.image} alt={selected.label} width={600} height={600} /><div><h3>{selected.label}</h3><ArrowUpRight size={22} /></div><p>{prices.length ? `${matches.length} designs · ${formatProductPrice(Math.min(...prices))} – ${formatProductPrice(Math.max(...prices))}` : 'Discover the collection'}</p></Link>
        </div>
        <div className={styles.bottom}><span>A shape for every space. A style that feels like you.</span><Link href="/room-planner/" onClick={close}>Plan your room <ArrowUpRight size={15} /></Link></div>
      </div>
    </dialog>, document.body)}
  </>;
}
