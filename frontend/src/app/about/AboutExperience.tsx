'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Search, X, Sofa, Gem, Leaf } from 'lucide-react';
import MiniCart from '@/components/MiniCart';
import SiteFooter from '@/components/SiteFooter';
import styles from './about.module.css';

const collections = [
  { name: 'Sofa Collection', word: 'Comfort', description: 'Considered shapes and generous cushions. Made for the moments that feel like home.', image: '/images/about/sofa-collection.webp', alt: 'Soft grey modular sofa in a quiet timber and stone living room', href: '/products' },
  { name: 'Corner Collection', word: 'Together', description: 'A little more room to stretch out, settle in, and spend time together.', image: '/images/sofas/premium-corner.webp', alt: 'Warm brown leather corner sofa in a sunlit living room', href: '/products?category=Corner' },
  { name: 'Recliner Collection', word: 'Unwind', description: 'Put your feet up. Find your favourite position. Make yourself comfortable.', image: '/images/sofas/premium-recliners.webp', alt: 'A pair of charcoal recliner sofas with soft textured upholstery', href: '/products?category=Recliner' },
];

const menuLinks = [
  { label: 'Home', href: '/' },
  { label: 'Our collection', href: '/products' },
  { label: 'Our story', href: '/about' },
  { label: 'Plan your room', href: '/room-planner/' },
  { label: 'Delivery', href: '/delivery-info' },
  { label: 'Contact', href: '/contact' },
];

function Wordmark() {
  return <span className={styles.wordmark} aria-hidden="true"><span>Corner</span><span>Sofa</span></span>;
}

export default function AboutExperience() {
  const [headerLight, setHeaderLight] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<'menu' | 'search' | null>(null);
  const [slide, setSlide] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLDialogElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const collection = collections[slide];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setHeaderLight(!entry.isIntersecting), { rootMargin: '-80px 0px 0px 0px' });
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [dialogOpen]);

  function openMenu() {
    menuRef.current?.showModal();
    setDialogOpen('menu');
  }

  function openSearch() {
    searchRef.current?.showModal();
    setDialogOpen('search');
    searchInputRef.current?.focus();
  }

  function changeSlide(direction: number) {
    setSlide(current => (current + direction + collections.length) % collections.length);
  }

  return (
    <div className={styles.page}>
      <header className={`${styles.header} ${headerLight ? styles.headerLight : ''}`}>
        <button ref={menuTriggerRef} className={styles.menuTrigger} type="button" onClick={openMenu} aria-label="Open navigation menu" aria-haspopup="dialog" aria-controls="about-navigation" aria-expanded={dialogOpen === 'menu'}>
          <span className={styles.menuLines} aria-hidden="true"><i /><i /><i /></span>
          <span className={styles.menuLabel}>Menu</span>
        </button>
        <Link href="/" className={styles.brand} aria-label="Corner Sofa home"><Wordmark /></Link>
        <div className={styles.headerActions}>
          <button ref={searchTriggerRef} type="button" onClick={openSearch} aria-label="Search sofas" aria-haspopup="dialog" aria-controls="about-search" aria-expanded={dialogOpen === 'search'}><Search size={20} strokeWidth={1.2} aria-hidden="true" /></button>
          <Link href="/reviews" aria-label="Customer feedback"><Heart size={20} strokeWidth={1.2} aria-hidden="true" /></Link>
          <MiniCart />
        </div>
      </header>

      <section ref={heroRef} className={styles.hero} aria-labelledby="about-title">
        <img src="/images/about/upholstery-detail.webp" alt="Close-up of warm brown and charcoal sofa upholstery in natural light" width={1800} height={1200} fetchPriority="high" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Comfort &middot; Considered design &middot; Corner Sofa</p>
          <h1 id="about-title">Timeless comfort.<br />Crafted for living.</h1>
          <div className={styles.heroStory}>
            <h2>Our story</h2>
            <p className={styles.heroIntro}>We're based in the UK, bringing thoughtful sofa design into everyday homes. A place to slow down. A little more room to live.</p>
            <p className={styles.heroDetail}>From a quiet moment on your own to a house full of people, the right sofa makes room for it all. Explore soft textures, considered shapes, and comfort that feels like you.</p>
            <a href="#about-collections" className={styles.heroLink}>Discover Corner Sofa <ArrowRight size={17} strokeWidth={1.2} aria-hidden="true" /></a>
          </div>
        </div>
      </section>
      <div className={styles.valuesStrip} aria-label="Our values">
        {[{ Icon: Leaf, title: 'Comfort', detail: 'Made for real life' }, { Icon: Gem, title: 'Considered design', detail: 'Thoughtful in every detail' }, { Icon: Sofa, title: 'Corner Sofa', detail: 'More space. More together.' }].map(({ Icon, title, detail }) => <div key={title}><Icon size={26} strokeWidth={1.2} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span></div>)}
      </div>

      <section id="about-collections" className={styles.collectionSection} aria-labelledby="collection-title">
        <div className={styles.collectionHeading}>
          <h2 id="collection-title">Only the essential.<br />Always the exceptional.</h2>
          <i aria-hidden="true">0</i>
        </div>
        <div className={styles.collectionStage} role="region" aria-roledescription="carousel" aria-label="Sofa collections">
          <picture className={styles.collectionPicture}>
            {slide === 0 && <source media="(max-width: 600px)" srcSet="/images/about/sofa-collection-mobile.webp" />}
            <img key={collection.image} src={collection.image} alt={collection.alt} width={1536} height={1024} loading="lazy" className={styles.collectionImage} />
          </picture>
          <Link href={collection.href} className={styles.collectionOrbit} aria-label={`Explore ${collection.name}`}><span>{collection.word}</span></Link>
          <div className={styles.collectionCaption}>
            <Link href={collection.href}><i aria-hidden="true">0{slide + 1}</i><h3>{collection.name}</h3><ArrowUpRight size={22} strokeWidth={1.1} aria-hidden="true" /></Link>
            <p>{collection.description}</p>
            <div className={styles.slideIndicators}>
              {collections.map((item, index) => <button key={item.name} type="button" onClick={() => setSlide(index)} aria-label={`Show ${item.name}`} aria-pressed={slide === index}><span /></button>)}
            </div>
          </div>
        </div>
        <div className={styles.collectionControls}>
          <button type="button" onClick={() => changeSlide(-1)} aria-label="Previous collection"><ArrowLeft size={18} strokeWidth={1.1} aria-hidden="true" /></button>
          <button type="button" onClick={() => changeSlide(1)} aria-label="Next collection"><ArrowRight size={18} strokeWidth={1.1} aria-hidden="true" /></button>
          <span className="sr-only" role="status">{collection.name}, {slide + 1} of {collections.length}</span>
        </div>
      </section>

      <section className={styles.phoneShowcase} aria-label="Good design. A simpler way to shop.">
        {[
          { title: 'UK based.', detail: 'Your sofa store, close to home. Our team is here to help.', image: '/images/about/sofa-collection.webp', caption: 'Good design. A simpler way to shop.' },
          { title: 'Free UK delivery.', detail: 'From our collection to your home. Free delivery across mainland UK.', image: '/images/sofas/premium-two-seater.webp', caption: 'From our collection to your home.' },
          { title: 'Cash on delivery.', detail: 'Pay when your sofa arrives. No extra fee to pay on delivery.', image: '/images/sofas/premium-corner.webp', caption: 'Comfort, delivered to your door.' },
        ].map((item, index) => <article className={styles.phoneFrame} key={item.title}>
          <div className={styles.phoneScreen}>
            <div className={styles.phoneStatus} aria-hidden="true"><span>9:41</span><i /><span>▮▮▮ ▰</span></div>
            <div className={styles.phoneBrand}><span aria-hidden="true">☰</span><Wordmark /><span aria-hidden="true">♡</span></div>
            <div className={styles.phoneCopy}><p>0{index + 1} / CLOSER TO HOME</p><h2>{item.title}</h2><p>{item.detail}</p></div>
            <img src={item.image} alt={item.title === 'UK based.' ? 'Sofas in a light-filled living room' : 'Comfortable sofa in a warm home'} loading="lazy" />
            <div className={styles.phoneBottom}><h3>{item.caption}</h3><Link href="/contact">Talk to us about your order <ArrowUpRight size={15} /></Link></div>
            <span className={styles.phoneHomeBar} aria-hidden="true" />
          </div>
        </article>)}
      </section>
      <section className={styles.otherCollections} aria-labelledby="other-title">
        <div className={styles.otherHeading}><h2 id="other-title">Other collections</h2><p>Different shapes. The same feeling of home.<br />Find the comfort that fits your space.</p></div>
        <div className={styles.otherGrid}>
          <Link href="/products?category=Corner" className={styles.otherCard}>
            <img src="/images/sofas/comfort-hero.webp" alt="Cream corner sofa with generous cushions" width={1200} height={900} loading="lazy" />
            <span className={styles.otherOrbit} aria-hidden="true" />
            <span className={styles.otherCaption}>Corner sofas <ArrowUpRight size={21} strokeWidth={1.2} aria-hidden="true" /></span>
          </Link>
          <Link href="/products?category=Recliner" className={styles.otherCard}>
            <img src="/images/sofas/premium-recliners.webp" alt="Soft charcoal recliner sofas in a calm interior" width={1200} height={900} loading="lazy" />
            <span className={styles.otherOrbit} aria-hidden="true" />
            <span className={styles.otherCaption}>Recliners <ArrowUpRight size={21} strokeWidth={1.2} aria-hidden="true" /></span>
          </Link>
        </div>
      </section>

      <SiteFooter />

      <dialog ref={menuRef} id="about-navigation" className={styles.menuDialog} aria-label="Navigation menu" onClose={() => { setDialogOpen(null); menuTriggerRef.current?.focus(); }}>
        <div className={styles.dialogTop}><Link href="/" aria-label="Corner Sofa home" onClick={() => menuRef.current?.close()}><Wordmark /></Link><button type="button" autoFocus onClick={() => menuRef.current?.close()} aria-label="Close navigation menu"><X size={26} strokeWidth={1.1} aria-hidden="true" /></button></div>
        <nav aria-label="About page navigation" className={styles.menuLinks}>{menuLinks.map(item => <Link key={item.href} href={item.href} aria-current={item.href === '/about' ? 'page' : undefined} onClick={() => menuRef.current?.close()}>{item.label}<ArrowUpRight size={25} strokeWidth={1.1} aria-hidden="true" /></Link>)}</nav>
        <p className={styles.menuNote}>UK based. Free UK delivery.<br />Cash on delivery available.</p>
      </dialog>
      <dialog ref={searchRef} id="about-search" className={styles.searchDialog} aria-label="Search the collection" onClick={event => { if (event.target === event.currentTarget) searchRef.current?.close(); }} onClose={() => { setDialogOpen(null); searchTriggerRef.current?.focus(); }}>
        <div className={styles.searchInner}><button type="button" className={styles.searchClose} onClick={() => searchRef.current?.close()} aria-label="Close search"><X size={24} strokeWidth={1.2} aria-hidden="true" /></button><h2>Find your comfort.</h2><form action="/products" role="search"><label htmlFor="about-search-input" className="sr-only">Search sofas</label><input ref={searchInputRef} id="about-search-input" type="search" name="q" placeholder="Search sofas, fabrics or colours" /><button type="submit" aria-label="Search"><ArrowRight size={24} strokeWidth={1.2} aria-hidden="true" /></button></form></div>
      </dialog>
    </div>
  );
}
