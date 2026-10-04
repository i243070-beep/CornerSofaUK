'use client';
import { useState } from 'react';
import { ArrowUpRight, Mail, MessageCircle } from 'lucide-react';
import styles from './contact.module.css';

export default function ContactForm({ initialMessage }: { initialMessage: string }) {
  const [channel, setChannel] = useState('whatsapp');
  const [prepared, setPrepared] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = `${data.get('first')} ${data.get('last') || ''}`.trim();
    const reference = String(data.get('order') || '').trim();
    const message = `${data.get('message')}\n\nFrom: ${name}\nEmail: ${data.get('email')}${reference ? `\nOrder: ${reference}` : ''}`;
    const url = channel === 'whatsapp' ? `https://wa.me/447456439050?text=${encodeURIComponent(message)}` : `mailto:cornersofaonlineuk@gmail.com?subject=${encodeURIComponent(reference ? `Order enquiry ${reference}` : 'Corner Sofa enquiry')}&body=${encodeURIComponent(message)}`;
    if (channel === 'whatsapp') window.open(url, '_blank', 'noopener,noreferrer');
    else window.location.href = url;
    setPrepared(true);
  }
  return <section className={styles.formCard} aria-labelledby="message-title"><p className={styles.eyebrow}>Make yourself heard</p><h2 id="message-title">What can we help with?</h2><p>Tell us a little about what you need.</p>
    <form onSubmit={submit} onChange={() => setPrepared(false)}>
      <div className={styles.nameRow}><label>First name *<input name="first" autoComplete="given-name" required maxLength={80} placeholder="Your first name" /></label><label>Last name<input name="last" autoComplete="family-name" maxLength={80} placeholder="Your last name" /></label></div>
      <label>Email *<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
      <label>Order number <span>(optional)</span><input name="order" maxLength={40} placeholder="Your order reference" /></label>
      <label>Your message *<textarea name="message" required maxLength={3000} rows={5} defaultValue={initialMessage} placeholder="A sofa you love, a delivery question, or something else..." /></label>
      <fieldset><legend>How would you like to send it?</legend><div className={styles.channels}>{[['whatsapp','WhatsApp'],['email','Email']].map(([value,label]) => <label key={value}><input type="radio" name="channel" value={value} checked={channel === value} onChange={() => setChannel(value)} />{value === 'whatsapp' ? <MessageCircle size={16} /> : <Mail size={16} />}{label}</label>)}</div></fieldset>
      <button className={styles.submit} type="submit">Continue to {channel === 'whatsapp' ? 'WhatsApp' : 'email'} <ArrowUpRight size={19} /></button>
      <p className={styles.formNote}>Your message opens in {channel === 'whatsapp' ? 'WhatsApp' : 'your email app'} for you to review and send.</p>
      {prepared && <p role="status" className={styles.status}>Message prepared. Complete sending in {channel === 'whatsapp' ? 'WhatsApp' : 'your email app'}.</p>}
    </form>
  </section>;
}
