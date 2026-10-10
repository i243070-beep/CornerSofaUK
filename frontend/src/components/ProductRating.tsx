'use client';
import { readApiJson } from '@/lib/api-json';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { ReviewSummary } from '@/lib/reviews';

const Ratings = createContext<ReviewSummary | null>(null);
export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [ratings, setRatings] = useState<ReviewSummary | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => fetch('/api/reviews/?summary=1', { cache: 'no-store' }).then(res => { if (!res.ok) throw Error(); return readApiJson(res); }).then(data => { if (active) setRatings(data); }).catch(() => {});
    refresh();
    window.addEventListener('reviews-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('reviews-updated', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  return <Ratings.Provider value={ratings}>{children}</Ratings.Provider>;
}
export default function ProductRating({ productId }: { productId: string }) {
  const ratings = useContext(Ratings);
  const score = ratings?.[productId];
  return <Link href={`/reviews?product=${encodeURIComponent(productId)}#review-form`} className="inline-flex items-center gap-1 text-xs normal-case tracking-normal text-[#596452] hover:underline" aria-label={score ? `${score.average.toFixed(1)} out of 5, ${score.count} reviews. Rate this sofa` : 'Rate this sofa'}>
    <Star size={14} color="#d3aa39" fill={score ? '#d3aa39' : 'none'} aria-hidden="true" />
    {score ? `${score.average.toFixed(1)} (${score.count})` : 'Rate this sofa'}
  </Link>;
}
