import SocialLinks from './SocialLinks';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Banknote, Layers3, Mail, Palette, Phone, Truck } from 'lucide-react';
import styles from './SiteFooter.module.css';

const columns = [
  { title: 'The collection', links: [['All sofas', '/products'], ['3+2 seater sets', '/products?category=Sofa%20Sets'], ['Corner sofas', '/products?category=Corner'], ['U-shape sofas', '/products?category=U-Shape'], ['Recliners', '/products?category=Recliner'], ['Sofa beds', '/products?category=Sofa%20Bed']] },
  { title: 'Here to help', links: [['Delivery information', '/delivery-info'], ['Size & measuring guide', '/size-guide'], ['Free fabric swatches', '/swatches'], ['Common questions', '/faq'], ['Plan your room', '/room-planner/'], ['Contact us', '/contact']] },
  { title: 'Corner Sofa', links: [['Our story', '/about'], ['Visit our showroom', '/appointment'], ['Customer reviews', '/reviews'], ['Ideas & inspiration', '/blog']] },
];
const services = [
  { icon: Truck, title: 'Free UK delivery', detail: 'A little closer to home', href: '/delivery-info' },
  { icon: Banknote, title: 'Cash on delivery', detail: 'Pay when your sofa arrives', href: '/faq' },
  { icon: Palette, title: 'Feel the fabric', detail: 'Find your favourite finish', href: '/swatches' },
  { icon: Layers3, title: 'Picture it at home', detail: 'Explore our room planner', href: '/room-planner/' },
];

export default function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={styles.services}>{services.map(({ icon: Icon, title, detail, href }) => <Link key={title} href={href}><Icon size={24} strokeWidth={1.4} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span></Link>)}</div>
    <div className={styles.inner}>
      <div className={styles.signature}><div className={styles.phoneSignature}><p>A conversation away</p><a href="tel:+447456439050"><Phone size={25} aria-hidden="true" />+44 7456 439050</a><small>Help with your sofa, colours and delivery</small></div><div className={styles.brandSignature}><p>Made for the way you live</p><Link href="/" aria-label="Corner Sofa home">corner<span>sofa.</span></Link></div></div>
      <div className={styles.columns}>
        {columns.map(column => <nav key={column.title} aria-label={column.title}><h2>{column.title}</h2>{column.links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</nav>)}
        <div className={styles.contact}><h2>Let’s find your perfect sofa</h2><p>From choosing a fabric to finding the right fit, we’re here to help.</p><a href="tel:+447456439050"><Phone size={16} aria-hidden="true" />+44 7456 439050</a><a href="mailto:cornersofaonlineuk@gmail.com"><Mail size={16} aria-hidden="true" /><span>cornersofaonlineuk@gmail.com</span></a><Link href="/appointment" className={styles.visit}>Arrange a showroom visit <ArrowUpRight size={17} /></Link></div>
      </div>
      <div className={styles.fabric}><div><Palette size={28} strokeWidth={1.4} /><span><strong>A colour you love. A texture that feels right.</strong><small>Bring the collection home with free fabric swatches.</small></span></div><Link href="/swatches">Explore the fabrics <ArrowRight size={18} /></Link></div>
      <div className={styles.socialPanel}>
        <div><p className={styles.socialEyebrow}>More inspiration, closer to home</p><h2>Find your next favourite.</h2><p>Follow our latest sofas, fabrics and room ideas.</p><SocialLinks /></div>
        <div className={styles.qrCards} aria-label="Social QR codes">
          <a className={styles.qrCard} href="https://www.instagram.com/cornersofa2026/" target="_blank" rel="noopener noreferrer"><img src="/images/instagram-qr.png" alt="Scan to follow cornersofa2026 on Instagram" width={1472} height={1690} loading="lazy" /><span><strong>Instagram</strong><small>@cornersofa2026</small><span>Open Instagram <ArrowUpRight size={16} aria-hidden="true" /></span></span></a>
          <a className={styles.qrCard} href="https://www.tiktok.com/@corner.sofa.online.uk" target="_blank" rel="noopener noreferrer"><img src="/images/tiktok-qr.jpg" alt="Scan to follow Corner Sofa on TikTok" width={900} height={900} loading="lazy" /><span><strong>TikTok</strong><small>@corner.sofa.online.uk</small><span>Open TikTok <ArrowUpRight size={16} aria-hidden="true" /></span></span></a>
        </div>
      </div>
      <div className={styles.bottom}><p>© {new Date().getFullYear()} Corner Sofa. All rights reserved.</p><nav aria-label="Legal information"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><span>United Kingdom · GBP £</span></nav></div>
    </div>
  </footer>;
}
