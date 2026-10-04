'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import SiteHeader from './SiteHeader';
import { SHOP_CATEGORIES } from '@/lib/shop-navigation';
import { categoryLabel as labelForCategory, SOFA_CATEGORIES } from '@/lib/product-categories';
import styles from './CatalogueHero.module.css';

type Props = { title: string; categoryLabel: string; category: string; count: number; priceRange: string; loading: boolean; onCategoryChange: (category: 'All' | typeof SOFA_CATEGORIES[number]) => void };

export default function CatalogueHero({ title, categoryLabel, category, count, priceRange, loading, onCategoryChange }: Props) {
  const selected = SHOP_CATEGORIES.find(item => item.category === category) || SHOP_CATEGORIES[1];
  const tabs = useRef<HTMLElement>(null);
  useEffect(() => {
    const current = tabs.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (current && tabs.current) tabs.current.scrollTo({ left: Math.max(0, current.offsetLeft - tabs.current.clientWidth / 2 + current.offsetWidth / 2) });
  }, [category]);
  return <>
    <SiteHeader />
    <section className={styles.hero} aria-labelledby="collection-title">
      <img className={styles.photo} src={selected.image} alt="" fetchPriority="high" />
      <div className={styles.content}>
        <nav aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={13} /><Link href="/products">Shop</Link><ChevronRight size={13} /><span aria-current="page">{categoryLabel}</span></nav>
        <p className={styles.eyebrow}>The considered collection</p>
        <h1 id="collection-title">{categoryLabel}</h1>
        <p className={styles.description}>{title}</p>
        <p className={styles.stats} aria-live="polite">{loading ? 'Discover your next favourite seat' : `${count} designs${priceRange ? ` · ${priceRange}` : ''}`}</p>
      </div>
      <nav ref={tabs} className={styles.tabs} aria-label="Sofa categories">
        {(['All', ...SOFA_CATEGORIES] as const).map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => onCategoryChange(item)}>{item === 'All' ? 'All sofas' : labelForCategory(item)}</button>)}
      </nav>
    </section>
  </>;
}
