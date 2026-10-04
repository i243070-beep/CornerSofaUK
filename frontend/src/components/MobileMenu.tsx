'use client';

import { useState, useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Armchair, Menu, Palette, X } from 'lucide-react';

const SOFA_LINKS = [
  { href: '/products', label: 'All sofas' },
  { href: '/products?category=Corner', label: 'Corner sofas' },
  { href: '/products?category=2-Seater', label: '2 seater sofas' },
  { href: '/products?category=3-Seater', label: '3 seater sofas' },
  { href: '/products?category=Recliner', label: 'Recliner sofas' },
  { href: '/products?category=U-Shape', label: 'U-shape sofas' },
  { href: '/products?category=Sofa%20Bed', label: 'Sofa beds' },
  { href: '/products?category=Sofa%20Sets', label: 'Sofa sets' },
  { href: '/products?category=Armchairs', label: 'Armchairs' },
  { href: '/products?category=Footstools', label: 'Footstools' },
];
const MORE_LINKS = [
  { href: '/swatches/', label: 'Swatches' },
  { href: '/build', label: 'Build your sofa' },
  { href: '/room-planner/', label: 'Plan my room' },
  { href: '/about', label: 'Our story' },
  { href: '/appointment', label: 'Visit our showroom' },
  { href: '/size-guide', label: 'Size guide' },
  { href: '/my-orders', label: 'My orders & deliveries' },
  { href: '/delivery-info', label: 'Delivery information' },
  { href: '/reviews', label: 'Customer reviews' },
  { href: '/faq', label: 'FAQs' },
  { href: '/contact', label: 'Get in touch' },
];

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  function closeMenu() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  useEffect(() => {
    dialogRef.current?.close();
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1280px)');
    function handleResize(event: MediaQueryListEvent) {
      if (event.matches) closeMenu();
    }
    desktop.addEventListener('change', handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', handleResize);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          dialogRef.current?.showModal();
          setIsOpen(true);
        }}
        className="mobile-menu-trigger flex h-11 w-11 items-center justify-center rounded-full text-[#28352c] transition-colors hover:bg-[#e9ece4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#526449] xl:hidden"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        aria-haspopup="dialog"
      >
        <Menu size={23} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Navigation menu"
        onClose={() => {
          setIsOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        className="fixed inset-0 m-0 ml-auto h-dvh max-h-none w-[min(88vw,400px)] max-w-none overflow-y-auto border-0 bg-[#fafbf7]/95 p-0 text-[#28352c] shadow-2xl backdrop-blur-2xl backdrop:bg-[#1b281e]/40 backdrop:backdrop-blur-sm"
      >
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0, x: isOpen || reduceMotion ? 0 : 24 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          className="flex min-h-full flex-col px-7 pb-8 pt-6"
        >
          <div className="mb-9 flex items-center justify-between">
            <Link href="/" onClick={closeMenu} aria-label="Corner Sofa home" className="flex items-center gap-2.5"><Armchair size={27} strokeWidth={1.5} aria-hidden="true" /><span className="text-[28px] font-semibold tracking-[-0.07em]">corner<span className="ml-1.5 text-[9px] font-medium tracking-[0.18em]">SOFA</span></span></Link>
            <button type="button" autoFocus onClick={closeMenu} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#e9ece4] text-[#344536] transition-colors hover:bg-[#dde3d6]" aria-label="Close navigation menu"><X size={21} strokeWidth={1.6} aria-hidden="true" /></button>
          </div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a8275]">Find your comfort</p>
          <nav aria-label="Mobile sofa collections" className="mb-6 space-y-2">
            {SOFA_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenu} className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-[#d6ddcc] bg-[#edf1e6]/80 px-4 py-3 text-base font-medium tracking-[-0.025em] text-[#344536] transition-colors hover:border-[#aeba9b] hover:bg-[#dfe8d3]">
                {link.label}<ArrowUpRight size={17} strokeWidth={1.5} className="text-[#7a8275] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <Link href="/swatches" onClick={closeMenu} className="mb-7 flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#344536] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#243326]"><Palette size={17} strokeWidth={1.5} aria-hidden="true" />Order free fabric swatches</Link>
          <nav aria-label="Mobile customer information" className="grid grid-cols-2 gap-x-3 gap-y-1">
            {MORE_LINKS.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} aria-current={pathname === link.href ? 'page' : undefined} className="flex min-h-11 items-center py-2 text-xs leading-relaxed text-[#626b5e] transition-colors hover:text-[#28352c]">{link.label}</Link>)}
          </nav>
          <p className="mt-auto border-t border-[#28352c]/10 pt-6 text-xs text-[#7a8275]">Thoughtfully made. Beautifully lived in.</p>
        </motion.div>
      </dialog>
    </>
  );
}
