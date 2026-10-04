import '../../styles/globals.css';
import { CartProvider } from '@/context/CartContext';
import '../../styles/storefront-responsive.css';
import '../../styles/home-refresh.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BackToTop from '@/components/BackToTop';
import StorefrontOnly from '@/components/StorefrontOnly';
import RoomPlannerLink from '@/components/RoomPlannerLink';

import { Metadata } from 'next';
import { generateOrganizationSchema } from '@/lib/schema';
import Analytics from '@/components/Analytics';
import { ReviewsProvider } from '@/components/ProductRating';
import AlashiChat from '@/components/AlashiChat';
import ThemeToggle from '@/components/ThemeToggle';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://cornersofa.co.uk';

export const metadata: Metadata = {
  title: {
    default: 'Corner Sofa | Premium UK Handmade Sofas',
    template: '%s | Corner Sofa',
  },
  description: 'Premium quality, handmade sofas crafted in the UK. Free delivery, 10-year warranty, and free fabric swatches. Shop 2-seater, 3-seater, corner, and recliner sofas.',
  keywords: ['sofas', 'handmade sofas', 'UK sofas', 'corner sofas', '2-seater sofas', '3-seater sofas', 'recliner sofas', 'premium sofas', 'luxury sofas', 'free delivery sofas'],
  authors: [{ name: 'Corner Sofa' }],
  creator: 'Corner Sofa',
  publisher: 'Corner Sofa',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: 'Corner Sofa',
    title: 'Corner Sofa | Premium UK Handmade Sofas',
    description: 'Premium quality, handmade sofas crafted in the UK. Free delivery, 10-year warranty, and free fabric swatches.',
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Corner Sofa — Premium UK Handmade Sofas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Corner Sofa | Premium UK Handmade Sofas',
    description: 'Premium quality, handmade sofas crafted in the UK. Free delivery, 10-year warranty.',
    images: [`${SITE_URL}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = generateOrganizationSchema();
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.theme=localStorage.getItem('sofa-theme')==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}"}}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} /></head>
      <body className="bg-primary text-dark font-sans flex flex-col min-h-screen">
        <CartProvider>
          <ReviewsProvider>
          <Analytics />
          <ThemeToggle />
          <a href="#main-content" className="skip-link">Skip to content</a>
          <StorefrontOnly hideOnHome hideOn={['/about', '/contact', '/reviews', '/products', '/build']}><SiteHeader /><RoomPlannerLink /></StorefrontOnly>
          <main id="main-content" tabIndex={-1} className="flex-grow">{children}</main>
          <StorefrontOnly><AlashiChat /></StorefrontOnly>
          <StorefrontOnly hideOn={['/about', '/contact', '/reviews']}><SiteFooter /><BackToTop /></StorefrontOnly>
          </ReviewsProvider>
        </CartProvider>
      </body>
    </html>
  );
}
