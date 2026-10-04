import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, Star, MessageCircle } from 'lucide-react';
import HomeHero from '@/components/HomeHero';
import HomeProductSections from '@/components/HomeProductSections';
import LazyImage from '@/components/LazyImage';
import { listProducts } from '@/lib/product-store';
import { formatProductPrice, getProductPrice } from '@/lib/product-options';
import { inCategory } from '@/lib/product-categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Corner Sofa | Beautifully British. Comfortably Yours.',
  description: 'Shop handmade British sofas with free UK delivery.',
  alternates: { canonical: '/' },
};

const categories = [
  { title: '2-seater sofas', href: '/products?category=2-Seater', image: '/images/catalogue-rooms/027-71994f42d9b65d40f8a7d5c2.webp', price: '£2,499', rating: '4.8', detail: 'Compact 2-seater sofas for cosy rooms', types: '2-Seater Sofas, Small Space Sofas' },
  { title: '3-seater sofas', href: '/products?category=3-Seater', image: '/images/catalogue-rooms/089-9f8b66ab88cc03355c24dc19.webp', price: '£2,899', rating: '5.0', detail: 'Generous 3-seater sofas made to unwind', types: '3-Seater Sofas, Family Sofas' },
  { title: 'Corner sofas', href: '/products?category=Corner', image: '/images/catalogue/a11060d356fdd0b0dff054ed.webp', price: '£3,599', rating: '4.9', detail: 'Statement corner sofas for gathering', types: 'Corner Sofas, Leather & Fabric' },
  { title: 'U-shape sofas', href: '/products?category=U-Shape', image: '/images/catalogue-rooms/093-78b583e58c0893e59241b5a2.webp', price: '£3,999', rating: '4.9', detail: 'Spacious U-shape sofas for everyone', types: 'U-Shape Sofas, Modular Sofas' },
  { title: 'Recliner sofas', href: '/products?category=Recliner', image: '/images/catalogue-rooms/030-4e450b8b77d832e79eec5490.webp', price: '£2,299', rating: '5.0', detail: 'Recliner sofas made for deep relaxation', types: 'Electric & Manual Recliner Sofas' },
];

export default async function HomePage() {
  const catalogue = await listProducts().catch(() => undefined);
  const products = catalogue || [];
  const sofaBeds = products.filter(product => inCategory(product, 'Sofa Bed'));
  const homeCategories = [...categories, {
    title: 'Sofa beds', href: '/products?category=Sofa%20Bed', image: '/images/catalogue-rooms/134-24ef63e9ffb0ca0d1593f6ea.webp',
    price: sofaBeds.length ? formatProductPrice(Math.min(...sofaBeds.map(getProductPrice))) : '',
    rating: '', detail: 'Comfort by day, a cosy bed by night', types: 'Sofa Beds, Guest Room Comfort',
  }].map(category => {
    const name = new URLSearchParams(category.href.split('?')[1]).get('category') || '';
    const matches = products.filter(product => inCategory(product, name));
    return { ...category, rating: '', price: matches.length ? formatProductPrice(Math.min(...matches.map(getProductPrice))) : '' };
  });
  return (
    <div className="storefront-home">
      <HomeHero />
      <section id="collections" className="category-orbit-section home-dark-categories">
        <h2 className="home-category-title">Our Categories</h2>
        <div className="category-orbit-grid">
          {homeCategories.map(category => (
            <article key={category.title} className="category-orbit-item">
              <Link href={category.href} className="category-orbit-link">
                <span className="category-orbit-photo">
                  <LazyImage src={category.image} alt={category.title} className="h-full w-full" />
                </span>
                <strong>{category.title}</strong>
              </Link>
              <div className="category-orbit-details">
                <div className="category-orbit-info">
                  <div className="category-orbit-title-row">
                    <h3>{category.detail}</h3>
                    {category.rating && <span>{category.rating}<Star size={13} fill="currentColor" aria-hidden="true" /></span>}
                  </div>
                  <p>{category.types}</p>
                </div>
                <div className="category-orbit-buy">
                  <p>{category.price ? <><span>From</span><strong>{category.price}</strong></> : <span>Coming soon</span>}</p>
                  <Link href={category.href} aria-label={`Shop ${category.title}`}>
                    Shop <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto my-12 grid max-w-7xl overflow-hidden rounded-3xl bg-[#203e33] text-[#fbf3df] md:grid-cols-2"><img src="/images/about/sofa-collection.webp" alt="Create your own sofa with Corner Sofa" className="h-full max-h-[480px] w-full object-cover" loading="lazy"/><div className="flex flex-col justify-center p-8 sm:p-12"><p className="mb-5 text-xs uppercase tracking-[.22em] text-[#d4b97e]">Your own design story</p><h2 className="font-serif text-4xl">A sofa with a little<br/><em>more you.</em></h2><p className="mt-6 text-sm leading-7 text-[#d1dac4]">Choose your shape. Find your finish. Make room for the details that matter.</p><Link href="/build" className="mt-8 inline-flex w-fit items-center gap-5 rounded-full bg-[#d9b77a] px-6 py-4 text-sm font-semibold text-[#233d2d]">Start building <ArrowUpRight size={18}/></Link></div></section>
      <section className="home-planner-poster" aria-labelledby="home-planner-heading">
        <div className="home-planner-photo"><img src="/images/sofas/catalogue-mountain-room.webp" alt="A sofa arranged in a light-filled living room" loading="lazy" /><span>Your space. A fresh perspective.</span></div>
        <div className="home-planner-copy"><p className="home-planner-eyebrow">Picture the possibilities</p><h2 id="home-planner-heading">Your room.<br /><em>Beautifully planned.</em></h2><p>Upload a photo of your room, choose your sofa and find the place it belongs. Make space for a home that feels like you.</p><Link href="/room-planner/">Plan my room <ArrowUpRight size={18} aria-hidden="true" /></Link><small>Upload your room ? Choose your sofa ? Explore the fit</small></div>
      </section>
      <HomeProductSections initialProducts={catalogue?.slice(0, 3)} />
      <a href="https://wa.me/447456439050" target="_blank" rel="noopener noreferrer" aria-label="Chat with Corner Sofa on WhatsApp" className="fixed bottom-28 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-[#1c7846] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[#155f37] sm:bottom-24"><MessageCircle size={21} aria-hidden="true" />WhatsApp</a>
    </div>
  );
}
