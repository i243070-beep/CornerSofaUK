export default function Loading() {
  return <section role="status" aria-live="polite" aria-label="Loading page" className="mx-auto min-h-[60vh] max-w-7xl px-6 py-16">
    <p className="mb-8 text-sm">Making room for you…</p>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-10 w-2/3 rounded-xl bg-current/10" />
      <div className="h-5 w-1/2 rounded-lg bg-current/10" />
      <div className="grid grid-cols-2 gap-6"><div className="h-64 rounded-2xl bg-current/10" /><div className="h-64 rounded-2xl bg-current/10" /></div>
    </div>
  </section>;
}
