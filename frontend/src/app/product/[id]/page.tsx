'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Layers3, Ruler, ShieldCheck, ShoppingBag, Sofa, Truck } from 'lucide-react';
import SwatchRequestModal from '@/components/SwatchRequestModal';
import ProductRating from '@/components/ProductRating';
import TrySofaButton from '@/components/TrySofaButton';
import { ProductCard, Spinner } from '@/components/ui';
import { useCart } from '@/context/CartContext';
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/schema';
import { ensureLocalProductImages } from '@/lib/product-images';
import { isSofaPreviewUrl } from '@/lib/sofa-preview';
import { originalProductImage } from '@/lib/product-room-images';
import { formatProductPrice, getColourHex, getDefaultVariant, getProductPrice, getSavings, getVariantImages, type ProductVariant, type StoreProduct } from '@/lib/product-options';

const PRODUCT_CATEGORIES = [
  { label: 'All sofas', href: '/products' },
  { label: '2-seater sofas', href: '/products?category=2-Seater' },
  { label: '3-seater sofas', href: '/products?category=3-Seater' },
  { label: 'Corner sofas', href: '/products?category=Corner' },
  { label: 'U-shape sofas', href: '/products?category=U-Shape' },
  { label: 'Sofa beds', href: '/products?category=Sofa%20Bed' },
  { label: 'Electric recliners', href: '/products?category=Recliner&q=electric' },
  { label: 'Manual recliners', href: '/products?category=Recliner&q=manual' },
];

export default function ProductDetailPage() {
  return <Suspense fallback={<div className="flex min-h-[65vh] items-center justify-center bg-[#faf9f6]"><Spinner label="Finding your next favourite seat…" /></div>}><ProductDetailContent /></Suspense>;
}

function ProductDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const requestedVariantId = searchParams.get('variant');
  const { addItem, items } = useCart();
  const reduceMotion = useReducedMotion();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [showSwatchModal, setShowSwatchModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    let controller: AbortController | null = null;
    let disposed = false;
    async function fetchProduct(reset = false) {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      if (reset) {
        setLoading(true);
        setLoadError(false);
        setProduct(null);
        setSelectedVariant(null);
        setRelatedProducts([]);
        setSelectedImage(0);
        setAddedToCart(false);
      }
      try {
        const res = await fetch('/api/products/', { cache: 'no-store', signal: request.signal });
        if (!res.ok) throw new Error('Unable to load products');
        const responseProducts: StoreProduct[] = await res.json();
        if (!Array.isArray(responseProducts)) throw new Error('Invalid catalogue');
        const all = responseProducts.map(ensureLocalProductImages);
        const found = all.find((item) => item.id === params.id);
        if (disposed || request.signal.aborted) return;
        setProduct(found ?? null);
        setSelectedVariant((current) => {
          if (!found) return null;
          const preferredId = reset ? requestedVariantId : current?.id ?? requestedVariantId;
          return found.variants.find((variant) => variant.id === preferredId) ?? getDefaultVariant(found.variants) ?? null;
        });
        setRelatedProducts(found ? all.filter((item) => item.category === found.category && item.id !== found.id).slice(0, 4) : []);
        setSelectedImage(0);
        setAddedToCart(false);
        setLoadError(false);
      } catch {
        if (!disposed && !request.signal.aborted) setLoadError(true);
      } finally {
        if (!disposed && !request.signal.aborted) setLoading(false);
      }
    }
    const refresh = () => { void fetchProduct(); };
    void fetchProduct(true);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('corner-sofa-products') : null;
    channel?.addEventListener('message', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      controller?.abort();
      channel?.close();
      window.removeEventListener('focus', refresh);
    };
  }, [params.id, requestedVariantId, retryCount]);

  useEffect(() => {
    if (!addedToCart) return;
    const timeout = setTimeout(() => setAddedToCart(false), 3000);
    return () => clearTimeout(timeout);
  }, [addedToCart]);

  const quantityInBasket = items.find((item) => item.productId === product?.id && item.variantId === selectedVariant?.id)?.quantity ?? 0;
  const canAddToCart = !!selectedVariant && quantityInBasket < 10;

  const handleAddToCart = () => {
    if (!product || !selectedVariant || !canAddToCart) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      range_type: selectedVariant.range_type,
      color: selectedVariant.color,
      price: Number(selectedVariant.price),
      image: getVariantImages(product, selectedVariant)[0],
      title: product.title,
    });
    setAddedToCart(true);
    router.push('/cart');
  };

  if (loading) {
    return <div className="flex min-h-[65vh] items-center justify-center bg-[#faf9f6]"><Spinner label="Finding your next favourite seat…" /></div>;
  }

  if (!product) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#faf9f6] px-6 py-20 text-[#26352e]">
        <div className="max-w-md text-center">
          <Sofa size={40} strokeWidth={1.3} className="mx-auto mb-6 text-[#65745d]" aria-hidden="true" />
          <h1 className="font-serif text-4xl">{loadError ? 'A little pause.' : 'This seat is unavailable.'}</h1>
          <p className="mt-4 text-sm leading-7 text-[#647067]">{loadError ? 'We couldn’t load this sofa. Please try again in a moment.' : 'Explore the collection to find a sofa that feels like home.'}</p>
          {loadError && <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-6 min-h-12 rounded-full bg-[#26352e] px-7 text-sm text-white">Try again</button>}
          <Link href="/products" className="mx-auto mt-6 flex min-h-11 w-fit items-center gap-2 text-sm font-medium"><ArrowLeft size={16} aria-hidden="true" /> Back to the collection</Link>
        </div>
      </div>
    );
  }

  const currentPrice = Number(selectedVariant?.price ?? getProductPrice(product));
  const savings = getSavings(currentPrice, product.compare_at_price);
  const galleryImages = getVariantImages(product, selectedVariant);
  const galleryIndex = Math.min(selectedImage, Math.max(0, galleryImages.length - 1));
  const imageDescription = `${product.title}${selectedVariant?.color ? ` in ${selectedVariant.color}` : ''}`;
  const changeImage = (direction: number) => setSelectedImage((current) => (current + direction + galleryImages.length) % galleryImages.length);

  return (
    <div className="product-detail-page bg-[#faf9f6] pb-20 pt-6 text-[#26352e] md:pb-28 md:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProductSchema({
        title: product.title, description: product.description || '', images: galleryImages,
        base_price: currentPrice, id: product.id,
        in_stock: !!selectedVariant, availability_unknown: false,
      })).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Products', url: '/products' },
        { name: product.category, url: `/products?category=${encodeURIComponent(product.category)}` },
        { name: product.title, url: `/product/${product.id}` },
      ])).replace(/</g, '\\u003c') }} />

      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-6 text-[#687168] md:mb-9">
          <Link href="/" className="transition-colors hover:text-[#26352e]">Home</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <Link href="/products" className="transition-colors hover:text-[#26352e]">Collection</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="transition-colors hover:text-[#26352e]">{product.category}</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <span aria-current="page" className="text-[#26352e]">{product.title}</span>
        </nav>

        <section className="grid items-start gap-9 lg:grid-cols-[1.3fr_1fr] lg:gap-14 xl:gap-20">
          <div className="min-w-0 lg:sticky lg:top-28">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#eeece5] md:rounded-[32px]">
              <motion.div key={`${selectedVariant?.id}-${galleryIndex}`} initial={{ opacity: reduceMotion ? 1 : 0.65 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                <Image src={galleryImages[galleryIndex]} alt={`${imageDescription}${galleryImages.length > 1 ? `, view ${galleryIndex + 1}` : ''}`} fill priority sizes="(min-width: 1440px) 700px, (min-width: 1024px) 55vw, 100vw" className="object-contain" />
              </motion.div>
              <span className="absolute left-5 top-5 rounded-full border border-white/60 bg-white/[0.65] px-4 py-2 text-xs backdrop-blur-xl">{savings > 0 ? `${Math.round(savings / Number(product.compare_at_price) * 100)}% OFF` : `${product.category} collection`}</span>
              <TrySofaButton productId={product.id} variantId={selectedVariant?.id} title={product.title} />
              {galleryImages.length > 1 && (
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
                  <button type="button" onClick={() => changeImage(-1)} aria-label="Previous product image" className="flex size-11 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm backdrop-blur-xl transition-colors hover:bg-white"><ChevronLeft size={19} aria-hidden="true" /></button>
                  <span aria-live="polite" aria-atomic="true" className="rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs backdrop-blur-xl">{galleryIndex + 1} / {galleryImages.length}</span>
                  <button type="button" onClick={() => changeImage(1)} aria-label="Next product image" className="flex size-11 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm backdrop-blur-xl transition-colors hover:bg-white"><ChevronRight size={19} aria-hidden="true" /></button>
                </div>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto p-1" aria-label="Product images">
                {galleryImages.map((src, index) => (
                  <button type="button" key={`${src}-${index}`} onClick={() => setSelectedImage(index)} aria-label={`View image ${index + 1} of ${imageDescription}`} aria-pressed={galleryIndex === index} className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl transition-opacity ${galleryIndex === index ? 'ring-2 ring-[#65745d] ring-offset-2 ring-offset-[#faf9f6]' : 'opacity-60 hover:opacity-100'}`}>
                    <Image src={src} alt="" fill sizes="96px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="mt-5 flex items-center gap-2 text-xs leading-5 text-[#687168]"><Layers3 size={15} className="shrink-0" aria-hidden="true" /> Get to know the finish. Try free fabric samples at home.</p>
            {isSofaPreviewUrl(originalProductImage(galleryImages[galleryIndex])) && <p className="mt-2 text-xs leading-5 text-[#687168]">Colour preview. Actual fabric may vary; order a free swatch to check the finish.</p>}
          </div>

          <motion.div initial={{ opacity: 1, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#65745d]">Make room for comfort</p>
            <h1 className="font-serif text-[clamp(2.2rem,3.3vw,3.6rem)] font-normal leading-[1.12] tracking-[-0.035em]">{product.title}</h1>
            <ProductRating productId={product.id} />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#26352e]/10 pb-6">
              <div aria-live="polite" aria-atomic="true">
                {savings > 0 && <p className="mb-1 text-sm text-[#92998e]"><span className="sr-only">Was </span><del>{formatProductPrice(Number(product.compare_at_price))}</del></p>}
                <p className="text-2xl font-medium tracking-tight"><span className="sr-only">Price </span>{formatProductPrice(currentPrice)}</p>
                {savings > 0 && <p className="mt-1 text-sm font-semibold text-[#53674c]">Save {formatProductPrice(savings)}</p>}
              </div>
              <p className={`flex items-center gap-2 text-xs ${selectedVariant ? 'text-[#53674c]' : 'text-[#77665c]'}`}>
                <span aria-hidden="true" className={`size-1.5 rounded-full ${selectedVariant ? 'bg-[#65745d]' : 'bg-[#a68e7f]'}`} />
                {selectedVariant ? 'Available to order' : 'Currently unavailable'}
              </p>
            </div>
            {product.description && <p className="mt-6 text-sm leading-7 text-[#687168]">{product.description}</p>}

            <div className="mt-7 rounded-[24px] border border-white bg-white/[0.65] p-5 shadow-[0_12px_40px_-24px_rgba(38,53,46,0.18)] backdrop-blur-xl sm:p-6">
              <fieldset>
                <legend className="mb-4 text-sm font-medium">Choose your finish <span className="font-normal text-[#687168]">{selectedVariant ? `— ${selectedVariant.color}` : ''}</span></legend>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((variant) => {
                    const selected = selectedVariant?.id === variant.id;
                    const preview = getColourHex(variant);
                    return (
                      <button type="button" key={variant.id} onClick={() => { setSelectedVariant(variant); setSelectedImage(0); setAddedToCart(false); }} aria-pressed={selected} aria-label={`${variant.color}, ${variant.range_type}`} className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-colors ${selected ? 'border-[#65745d] bg-[#65745d]/[0.08] text-[#26352e]' : 'border-[#26352e]/10 bg-white/70 text-[#687168] hover:border-[#65745d]/60'}`}>
                        {preview && <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: preview }} />}
                        <span>{variant.color}{product.variants.some((item) => item.range_type !== variant.range_type) && <span className="block text-[11px]">{variant.range_type}</span>}</span>
                        {selected && <Check size={14} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
                {product.variants.length === 0 && <p className="text-sm text-[#687168]">Contact our team for available configurations.</p>}
              </fieldset>
              <Link href={`/build/?product=${product.id}&variant=${selectedVariant?.id || ""}`} className="mt-4 flex min-h-12 items-center justify-between rounded-xl border border-[#a7b590] bg-[#edf2e3] px-4 text-sm font-semibold text-[#344536]">Build this sofa <ArrowRight size={16} /></Link><button type="button" onClick={() => setShowSwatchModal(true)} className="mt-4 flex min-h-11 items-center gap-2 text-xs font-medium underline decoration-[#65745d]/30 underline-offset-4 transition-colors hover:text-[#65745d]"><Layers3 size={15} aria-hidden="true" /> Feel it first. Order free swatches <ArrowRight size={14} aria-hidden="true" /></button>
              {(addedToCart || quantityInBasket > 0) ? <Link href="/cart" className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#26352e] px-5 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#3c4d40]"><ShoppingBag size={20} aria-hidden="true" />View basket <ArrowRight size={20} aria-hidden="true" /></Link> : <button type="button" onClick={handleAddToCart} disabled={!canAddToCart || addedToCart} className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#26352e] px-5 py-4 text-sm font-medium text-white transition-colors hover:bg-[#3c4d40] disabled:cursor-not-allowed disabled:opacity-50">
                {addedToCart ? <Check size={18} aria-hidden="true" /> : <ShoppingBag size={18} aria-hidden="true" />}
                {addedToCart ? 'Added to your basket' : canAddToCart ? 'Add to basket' : 'Basket limit reached'}
                {canAddToCart && !addedToCart && <span className="ml-auto border-l border-white/25 pl-4">{formatProductPrice(currentPrice)}</span>}
              </button>}
              <div aria-live="polite" aria-atomic="true">
                {(addedToCart || quantityInBasket > 0) && <p className="mt-3 text-center text-xs leading-5 text-[#687168]">{addedToCart ? `${selectedVariant?.color} added. ` : `${quantityInBasket} in your basket. `}<Link href="/cart" className="font-medium text-[#26352e] underline underline-offset-4">View basket</Link></p>}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
              <Link href="/delivery-info" className="flex items-start gap-3 rounded-xl py-2 transition-colors hover:text-[#65745d]"><Truck size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="leading-5">Delivery, made simple<span className="block text-[#687168]">Explore delivery options</span></span></Link>
              <Link href="/size-guide" className="flex items-start gap-3 rounded-xl py-2 transition-colors hover:text-[#65745d]"><Ruler size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="leading-5">Find your perfect fit<span className="block text-[#687168]">View our measuring guide</span></span></Link>
            </div>

            <div className="mt-6 divide-y divide-[#26352e]/10 border-y border-[#26352e]/10">
              <details className="group py-5" open>
                <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">The details <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" /></summary>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-6"><dt className="text-[#687168]">Collection</dt><dd>{product.category}</dd></div>
                  {product.materials?.length ? <div className="flex justify-between gap-6"><dt className="text-[#687168]">Upholstery</dt><dd className="text-right">{product.materials.join(', ')}</dd></div> : null}
                  {Object.entries(product.specifications || {}).filter(([key]) => !/source|colour|color|material/i.test(key)).map(([key, value]) => <div className="flex justify-between gap-6" key={key}><dt className="text-[#687168]">{key}</dt><dd className="max-w-[65%] text-right">{Array.isArray(value) ? value.join(', ') : value}</dd></div>)}
                  {selectedVariant && <><div className="flex justify-between gap-6"><dt className="text-[#687168]">Configuration</dt><dd className="text-right">{selectedVariant.range_type}</dd></div><div className="flex justify-between gap-6"><dt className="text-[#687168]">Colour</dt><dd>{selectedVariant.color}</dd></div></>}
                </dl>
              </details>
              <details className="group py-5">
                <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">Delivery & getting ready <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" /></summary>
                <p className="mt-3 text-sm leading-7 text-[#687168]">Check the route from your front door to your favourite corner before ordering. Our delivery guide covers locations, timings and available services.</p>
                <Link href="/delivery-info" className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-medium">Read the delivery guide <ArrowRight size={14} aria-hidden="true" /></Link>
              </details>
              <details className="group py-5">
                <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">Care & peace of mind <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" /></summary>
                <p className="mt-3 flex items-start gap-3 text-sm leading-7 text-[#687168]"><ShieldCheck size={19} className="mt-1 shrink-0 text-[#65745d]" aria-hidden="true" />Need advice on your sofa’s fabric, care or warranty? Our team can help with the details for your chosen model.</p>
                <Link href="/contact" className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-medium">Speak to our team <ArrowRight size={14} aria-hidden="true" /></Link>
              </details>
            </div>
          </motion.div>
        </section>

        {relatedProducts.length > 0 && (
          <section aria-labelledby="related-products" className="mt-20 border-t border-[#26352e]/10 pt-12 md:mt-28 md:pt-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#65745d]">Keep exploring</p><h2 id="related-products" className="font-serif text-3xl tracking-[-0.025em] md:text-4xl">More room to fall in love.</h2></div>
              <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="flex min-h-11 items-center gap-2 text-sm">Shop the collection <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 2xl:grid-cols-4">
              {relatedProducts.map((item) => <ProductCard key={item.id} id={item.id} title={item.title} image={item.images[0]} newPrice={getProductPrice(item)} oldPrice={item.compare_at_price ?? undefined} variants={item.variants} category={item.category} badge="" />)}
            </div>
          </section>
        )}

        <nav className="product-category-footer" aria-label="All sofa categories">
          <div><p>Continue shopping</p><h2>Explore every sofa category.</h2></div>
          <div className="product-category-footer-links">
            {PRODUCT_CATEGORIES.map(category => <Link key={category.label} href={category.href}>{category.label}<ArrowRight size={14} aria-hidden="true" /></Link>)}
          </div>
        </nav>
      </div>

      <SwatchRequestModal isOpen={showSwatchModal} onClose={() => setShowSwatchModal(false)} />
    </div>
  );
}
