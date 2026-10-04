export default function OrderReference({ id }: { id: string }) {
  if (!/^[A-Z0-9]{6}$/.test(id)) return <code className="break-all font-mono text-lg font-semibold tracking-wider">{id}</code>;
  return <span aria-label={`Order number ${id}`} className="inline-flex flex-wrap gap-1">
    {id.split('').map((character, index) => <span key={`${index}-${character}`} className="flex h-9 w-8 items-center justify-center rounded-lg border border-[#e6c17a]/70 bg-gradient-to-b from-[#fff5db] to-[#ecd09a] font-mono text-base font-bold tracking-wide text-[#304237] shadow-[0_3px_12px_rgba(68,52,27,.13)]">{character}</span>)}
  </span>;
}
