'use client';

import Link from 'next/link';

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-2xl px-6 py-24">
    <h1 className="font-serif text-4xl">Let’s try that again.</h1>
    <p className="my-6 leading-7">We couldn’t load this page. Please retry, or contact us for help with your sofa.</p>
    <div className="flex flex-wrap gap-4"><button onClick={reset} className="rounded-full bg-[#503726] px-6 py-3 text-white">Try again</button><Link href="/contact/" className="rounded-full border border-current px-6 py-3">Contact us</Link></div>
  </section>;
}
