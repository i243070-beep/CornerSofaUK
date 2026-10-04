'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import LazyImage from '@/components/LazyImage';
import ProductRating from '@/components/ProductRating';
import TrySofaButton from '@/components/TrySofaButton';
import { isSofaPreviewUrl } from '@/lib/sofa-preview';
import { originalProductImage } from '@/lib/product-room-images';
import { categoryLabel } from '@/lib/product-categories';
import { formatProductPrice, getColourHex, getDefaultVariant, getSavings, getVariantImages, type ProductVariant } from '@/lib/product-options';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  id: string; title: string; image: string; oldPrice?: number | null;
  newPrice: number; saveAmount?: number; category?: string; badge?: string;
  href?: string; variants?: ProductVariant[]; layout?: 'grid' | 'list';
  description?: string | null; priceType?: string;
}

export default function ProductCard({ id, title, image, oldPrice, newPrice, category, badge, href, variants = [], layout = 'grid', description, priceType }: ProductCardProps) {
  const titleId = useId();
  const router = useRouter();
  const { addItem } = useCart();
  const [shopping, startShopping] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = variants.find(variant => variant.id === selectedId) || getDefaultVariant(variants);
  const selectedImage = getVariantImages({ images: [image] }, selected)[0] || image;
  const price = Number(selected?.price ?? newPrice);
  const savings = getSavings(price, oldPrice);
  const baseHref = href || `/product/${id}`;
  const productHref = selected ? `${baseHref}${baseHref.includes('?') ? '&' : '?'}variant=${encodeURIComponent(selected.id)}` : baseHref;
  const displayTitle = title.split('|')[0].trim();
  const accessory = category === 'Armchairs' || category === 'Footstools';
  function shopSofa() {
    if (!selected || shopping) return;
    startShopping(() => {
      addItem({ productId: id, variantId: selected.id, range_type: selected.range_type, color: selected.color, price, image: selectedImage, title });
      router.push('/cart/');
    });
  }

  return <article aria-labelledby={titleId} className={`sofa-detail-card ${styles.card} ${layout === 'list' ? styles.list : ''}`}>
    <div className={styles.photo}>
      <Link href={productHref} tabIndex={-1} className={styles.imageLink}>
        <LazyImage key={selectedImage} src={selectedImage} fallback={image} alt={`${displayTitle}${selected ? ` in ${selected.color}` : ''}`} className={styles.image} imgClassName={styles.photoImage} />
      </Link>
      {(savings > 0 || badge) && <span className={styles.badge}>{savings > 0 ? `Save ${formatProductPrice(savings)}` : badge}</span>}
      {!accessory && <TrySofaButton productId={id} variantId={selected?.id} title={displayTitle} />}
      {isSofaPreviewUrl(originalProductImage(selectedImage)) && <span className={styles.preview}>Colour preview</span>}
    </div>
    <div className={styles.body}>
      <p className={styles.category}>{category ? categoryLabel(category) : 'The sofa collection'}</p>
      <h3 id={titleId} className={styles.title}><Link href={productHref} title={title}>{displayTitle}</Link></h3>
      {description && <p className={styles.description}>{description.replace(/^Bring your living room together with .*?\.\s*/, '')}</p>}
      {variants.length > 0 && <div className={styles.colours}>
        <div className={styles.swatches} role="group" aria-label={`Colours for ${displayTitle}`}>
          {(expanded ? variants : variants.slice(0, 5)).map(variant => {
            const active = variant.id === selected?.id;
            const repeated = variants.some(other => other.id !== variant.id && other.color.toLowerCase() === variant.color.toLowerCase());
            const label = `${variant.color}${repeated ? ` · ${variant.range_type}` : ''}`;
            return <button key={variant.id} type="button" onClick={() => setSelectedId(variant.id)} aria-label={label} title={label} aria-pressed={active} className={styles.swatch}>
              <span style={{ backgroundColor: getColourHex(variant) }}>{active && <Check size={13} strokeWidth={2.5} />}</span>
            </button>;
          })}
          {variants.length > 5 && <button type="button" className={styles.more} aria-expanded={expanded} aria-label={`${expanded ? 'Fewer' : 'More'} colours for ${displayTitle}`} onClick={() => setExpanded(!expanded)}>{expanded ? 'Less' : `+${variants.length - 5}`}</button>}
        </div>
        <span className={styles.colourName}>{selected?.color}</span>
      </div>}
      <div className={styles.bottom}>
        <div className={styles.price} aria-label="Price">
          {savings > 0 && <del><span className="sr-only">Was </span>{formatProductPrice(Number(oldPrice))}</del>}
          <p>{priceType === 'from' && <small>From </small>}{formatProductPrice(price)}</p>
        </div>
        {accessory ? <Link href={productHref} className={styles.shop}>View details <ArrowUpRight size={17} aria-hidden="true" /></Link> : <button type="button" className={styles.shop} disabled={shopping || !selected} onClick={shopSofa}>{shopping ? 'Adding?' : selected ? 'Shop sofa' : 'Unavailable'} <ArrowUpRight size={17} aria-hidden="true" /></button>}
      </div>
      <div className={styles.footer}><ProductRating productId={id} /><span>{variants.length > 1 ? `${variants.length} options` : 'Explore the details'}</span></div>
      <p className="sr-only" role="status" aria-live="polite">{selected ? `${selected.color} selected, ${formatProductPrice(price)}` : ''}</p>
    </div>
  </article>;
}
