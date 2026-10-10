'use client';
import { readApiJson } from '@/lib/api-json';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Star, Quote, MessageSquare, Camera, ArrowUpRight, X } from 'lucide-react';
import type { CustomerReview } from '@/lib/reviews';
import styles from './reviews.module.css';

export default function ReviewsPage() { return <Suspense fallback={<div className={styles.scene}>Loading reviews…</div>}><ReviewsExperience /></Suspense>; }
function ReviewsExperience() {
  const params = useSearchParams();
  const selected = params.get('product') || '';
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);
  const [productId, setProductId] = useState(selected);
  const [rating, setRating] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => { setProductId(selected); }, [selected]);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    Promise.all([fetch('/api/reviews/', { cache: 'no-store' }), fetch('/api/products/', { cache: 'no-store' })])
      .then(async responses => { if (responses.some(res => !res.ok)) throw Error(); return Promise.all(responses.map(res => readApiJson(res))); })
      .then(([feedback, sofas]) => { if (active) { setReviews(feedback); setProducts(sofas); } })
      .catch(() => { if (active) setLoadError('Could not load reviews. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  const visible = selected ? reviews.filter(review => review.product_id === selected) : reviews;
  const average = visible.length ? (visible.reduce((sum, review) => sum + review.rating, 0) / visible.length).toFixed(1) : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSent(false);
    if (!rating) { setError('Please choose your star rating.'); return; }
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set('rating', String(rating));
    files.forEach(file => body.append('photos', file));
    setSaving(true);
    try {
      const response = await fetch('/api/reviews/', { method: 'POST', body });
      const result = await readApiJson(response);
      if (!response.ok) throw Error(result.error || 'Could not save your review. Please try again.');
      setReviews(current => [result, ...current]); setSent(true); form.reset(); setRating(0); setFiles([]);
      window.dispatchEvent(new Event('reviews-updated'));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save your review. Please try again.'); }
    finally { setSaving(false); }
  }
  return <div className={styles.scene}><div className={styles.sheet}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/">CORNER SOFA<span>UK</span></Link>
      <nav aria-label="Reviews navigation"><Link href="/">Home</Link><Link href="/products">Sofas</Link><Link href="/about">About</Link><Link href="/reviews" aria-current="page">Reviews</Link><Link href="/contact">Contact <ArrowUpRight size={13} /></Link></nav>
    </header>
    <section className={styles.hero}>
      <div><p className={styles.eyebrow}>YOUR HOME. YOUR WORDS.</p><h1>Hear what our<br />customers have to say.</h1><p>Real comfort, shared. Tell us about your sofa and show us how it looks at home.</p></div>
      <div className={styles.illustration} aria-hidden="true"><div><Star /><Star /><Star /><Star /><Star /></div><MessageSquare className={styles.bubbleOne} /><MessageSquare className={styles.bubbleTwo} /><span>♥</span></div>
    </section>
    <section aria-labelledby="testimonials-title">
      <div className={styles.sectionHeading}><div><h2 id="testimonials-title">Clients’ testimonials</h2><p>{average ? `${average} / 5 · ${visible.length} customer ${visible.length === 1 ? 'review' : 'reviews'}` : 'Your sofa story starts here.'}</p></div><Quote size={78} aria-hidden="true" /></div>
      {selected && <Link href="/reviews" className={styles.allReviews}>View all sofa reviews ↗</Link>}
      {loading ? <p role="status">Loading reviews…</p> : loadError ? <p role="alert">{loadError} <button onClick={() => setReload(value => value + 1)}>Retry</button></p> : visible.length ? <div className={styles.grid}>{visible.map(review => <article className={styles.card} key={review.id}>
        <div className={styles.cardHeader}><h3>{review.name}</h3><span aria-hidden="true">{review.name.charAt(0).toUpperCase()}</span></div>
        <div className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map(star => <Star key={star} size={13} fill={star <= review.rating ? 'currentColor' : 'none'} />)}</div>
        <p className={styles.reviewText}>{review.text}</p>
        {review.photos.length > 0 && <div className={styles.photos}>{review.photos.map((photo,index) => <a key={index} href={photo} download={`sofa-review-${review.id}-${index+1}.webp`} aria-label={`Download sofa photo ${index+1}`}><img src={photo} alt={`${review.name}'s delivered sofa, photo ${index+1}`} loading="lazy" /></a>)}</div>}
        <Link className={styles.product} href={`/product/${review.product_id}`}>{review.product_title}</Link>
        <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('en-GB')}</time>
      </article>)}</div> : <div className={styles.empty}><MessageSquare size={30} /><p>No reviews yet. Be the first to share your sofa.</p><a href="#review-form">Leave feedback ↗</a></div>}
    </section>
    <section className={styles.formSection} aria-labelledby="form-title">
      <div className={styles.formHeading}><h2 id="form-title">Like our sofas? Leave feedback.</h2><span aria-hidden="true">♥ ★ ☺</span></div>
      <form id="review-form" onSubmit={submit}>
        <fieldset disabled={saving}>
          <div className={styles.formRow}><label>Your name<input name="name" required maxLength={80} placeholder="Name" /></label><label>Your sofa<select name="product_id" required value={productId} onChange={event => setProductId(event.target.value)}><option value="">Choose your sofa</option>{products.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label></div>
          <div className={styles.rating}><span>Your rating</span><div role="radiogroup" aria-label="Your rating">{[1,2,3,4,5].map(star => <label key={star} title={`${star} stars`}><input type="radio" name="star-rating" value={star} checked={rating===star} onChange={() => setRating(star)} aria-label={`${star} ${star===1?'star':'stars'}`} /><Star size={25} fill={star<=rating?'currentColor':'none'} aria-hidden="true" /></label>)}</div></div>
          <label>Your review<textarea name="text" required minLength={5} maxLength={2000} rows={4} placeholder="Tell us about your sofa…" /></label>
          <div className={styles.uploadRow}><label className={styles.upload}><Camera size={20} /> Add sofa photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { const chosen = Array.from(event.target.files || []); if(chosen.length>3 || chosen.some(file=>file.size>4*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))){ setError('Choose up to 3 JPG, PNG or WebP photos, 4 MB each.'); event.target.value=''; return; } setFiles(chosen);setError(''); }} /></label><span>Up to 3 photos · 4 MB each</span></div>
          {previews.length > 0 && <div className={styles.previews}>{previews.map((url,index) => <div key={url}><img src={url} alt={`Selected sofa photo ${index+1}`} /><button type="button" aria-label={`Remove photo ${index+1}`} onClick={()=>setFiles(current=>current.filter((_,i)=>i!==index))}><X size={14} /></button></div>)}</div>}
          <button type="submit" className={styles.submit} disabled={loading || !!loadError || !products.length}>{saving?'Sharing…':'Share your review'} <ArrowUpRight size={17} /></button>
        </fieldset>
        {error && <p className={styles.error} role="alert">{error}</p>}{sent && <p className={styles.success} role="status">Thank you! Your review has been published.</p>}
      </form>
    </section>
    <footer className={styles.footer}><Link href="/">Corner Sofa</Link><span>Made for your home.</span></footer>
  </div></div>;
}
