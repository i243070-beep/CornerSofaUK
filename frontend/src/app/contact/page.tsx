import SocialLinks from '@/components/SocialLinks';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Phone, MessageCircle, Mail, MapPin, Truck, Banknote, ArrowUpRight } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from './ContactForm';
import styles from './contact.module.css';

export const metadata: Metadata = { title: 'Contact Corner Sofa', description: 'Speak with Samiullah at Corner Sofa about sofas, delivery and your order.', alternates: { canonical: '/contact' } };
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const enquiry = product ? `Hello, could you confirm availability for ${product.slice(0, 200)}?` : '';
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand}>Corner<span>Sofa.</span></Link><nav aria-label="Contact navigation"><Link href="/">Home</Link><Link href="/about">Our story</Link><Link href="/products">Shop sofas <ArrowUpRight size={14} /></Link></nav></header>
    <section className={styles.hero}><div><p className={styles.eyebrow}>A conversation away</p><h1>Good comfort starts<br />with <em>a little conversation.</em></h1><p>Choosing a sofa, planning a delivery or asking about your order?<br />Talk to Samiullah at Corner Sofa. We're here to help.</p></div><span className={styles.heroNote}>UK based.<br />Made for your everyday.</span></section>
    <main className={styles.content}><section className={styles.details} aria-label="Contact details"><p className={styles.eyebrow}>Let's make room for you</p><h2>Your home. Your questions.<br />A personal touch.</h2><p className={styles.intro}>Comfort for everyday living. Thoughtful sofas for your home. Get in touch for help with colours, sizes and finding the right fit.</p>
      <div className={styles.cards}>
        <a href="tel:+447456439050"><Phone /><span>Give us a call</span><strong>+44 7456 439050</strong><small>Speak with Samiullah</small></a>
        <div><MapPin /><span>At home in the UK</span><strong>United Kingdom</strong><small>Ask about delivery to your postcode</small></div>
        <a href="mailto:cornersofaonlineuk@gmail.com"><Mail /><span>Sofa enquiries</span><strong>cornersofaonlineuk@gmail.com</strong><small>Products, colours and delivery</small></a>
        <a href="mailto:furnishingshub52@gmail.com"><Mail /><span>Another way to reach us</span><strong>furnishingshub52@gmail.com</strong><small>General enquiries and support</small></a>
      </div>
      <a className={styles.whatsapp} href={`https://wa.me/447456439050?text=${encodeURIComponent(enquiry || 'Hello Corner Sofa, I would like some help.')}`} target="_blank" rel="noopener noreferrer"><MessageCircle /><span><strong>Let's chat on WhatsApp</strong><small>Ask a question or share a photo of your space</small></span><ArrowUpRight /></a>
      <Link href="/my-orders" className={styles.orderLink}><Truck /><span><strong>Already ordered your sofa?</strong><small>View your saved orders and delivery updates</small></span><ArrowUpRight /></Link>
      <section className={styles.instagramCard} aria-labelledby="social-qr-heading">
        <div className={styles.qrStack}>
          <a href="https://www.instagram.com/cornersofa2026/" target="_blank" rel="noopener noreferrer" aria-label="Open Corner Sofa Instagram profile"><img src="/images/instagram-qr.png" alt="Instagram QR code for cornersofa2026" width={1472} height={1690} loading="lazy" /><span>Instagram</span></a>
          <a href="https://www.tiktok.com/@corner.sofa.online.uk" target="_blank" rel="noopener noreferrer" aria-label="Open Corner Sofa TikTok profile"><img src="/images/tiktok-qr.jpg" alt="TikTok QR code for Corner Sofa" width={900} height={900} loading="lazy" /><span>TikTok</span></a>
        </div>
        <div><p className={styles.eyebrow}>A little everyday inspiration</p><h3 id="social-qr-heading">Follow us on Instagram and TikTok</h3><p>Scan with your phone camera for sofa inspiration, colours and our latest designs.</p><a href="https://www.instagram.com/cornersofa2026/" target="_blank" rel="noopener noreferrer">@cornersofa2026 <ArrowUpRight size={17} aria-hidden="true" /></a><a href="https://www.tiktok.com/@corner.sofa.online.uk" target="_blank" rel="noopener noreferrer">@corner.sofa.online.uk <ArrowUpRight size={17} aria-hidden="true" /></a></div>
      </section>
      <SocialLinks /><div className={styles.promises}><span><Truck size={17} />Free delivery in standard areas</span><span><Banknote size={17} />Cash on delivery</span></div>
    </section><ContactForm initialMessage={enquiry} /></main>
    <section className={styles.closing}><p>Crafted for comfort. Made for your home.</p><Link href="/products">Find your sofa <ArrowUpRight size={18} /></Link></section><SiteFooter />
  </div>;
}
