'use client';

import Link from 'next/link';
import { ArrowRight, Layers3, Search, PackageCheck } from 'lucide-react';
import MiniCart from '@/components/MiniCart';
import ProductNavigation from '@/components/ProductNavigation';
import SocialLinks from '@/components/SocialLinks';

export default function HomeHero() {
  return (
    <section className="reference-home-hero" aria-label="Corner Sofa introduction">
      <picture className="reference-hero-photo">
        <source media="(min-width: 761px) and (min-aspect-ratio: 1586/992)" srcSet="/images/sofas/blue-corner-room-wide.webp" />
        <img
          src="/images/sofas/blue-corner-room-hero.webp"
          alt="Cream corner sofa with a left chaise, woven coffee table and olive tree against a blue living room wall"
          width={1586}
          height={992}
          className="reference-hero-image"
          fetchPriority="high"
        />
      </picture>
      <div className="reference-hero-scene">
        <header className="reference-hero-nav">
          <Link href="/" className="reference-hero-brand" aria-label="Corner Sofa home">
            Corner<span>Sofa.</span>
          </Link>
          <ProductNavigation home separateActions />
          <div className="reference-hero-actions">
            <Link href="/room-planner/" className="home-plan-shortcut"><Layers3 size={18} aria-hidden="true" />Plan Room</Link>
            <div className="home-basket"><MiniCart /></div>
            <Link href="/my-orders/" className="home-orders-shortcut"><PackageCheck size={19} aria-hidden="true" /><span>My orders</span></Link>
            <SocialLinks compact />
          </div>
        </header>

        <div className="reference-hero-copy">
          <h1>Comfort Starts with the<br />Right Furniture</h1>
          <p>Thoughtful shapes, lasting comfort, and room for everyday living.</p>
          <div className="reference-hero-shop-row">
            <form action="/products" role="search" aria-label="Find your sofa" className="reference-hero-search">
              <label htmlFor="home-sofa-search" className="sr-only">Search furniture</label>
              <input id="home-sofa-search" type="search" name="q" placeholder="Search furniture" />
              <button type="submit" aria-label="Search furniture"><Search size={18} aria-hidden="true" /></button>
            </form>
            <Link href="/products" className="reference-hero-shop">Shop now <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>

      <div className="home-mobile-social"><SocialLinks compact /></div>
    </section>
  );
}
