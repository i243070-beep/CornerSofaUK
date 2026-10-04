import { Check } from 'lucide-react';

const STEPS = ['Order received', 'Approved', 'Being prepared', 'Delivery arranged', 'Delivered'];

export default function OrderProgress({ status }: { status: string }) {
  const index = status === 'delivered' ? 4 : status === 'shipped' ? 3 : status === 'processing' ? 2 : status === 'confirmed' ? 1 : 0;
  const cancelled = status === 'cancelled';
  return <div className="rounded-2xl border border-[#334538] bg-[#1f3028] px-3 py-5 text-[#f7f2e6] sm:px-5">
    <ol aria-label="Order progress" className="relative grid grid-cols-5 gap-1">
      <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[15px] h-[2px] rounded-full bg-white/15" />
      <span aria-hidden="true" className="absolute left-[10%] top-[15px] h-[2px] rounded-full bg-gradient-to-r from-[#ecad52] via-[#d8ca90] to-[#adc39a] transition-[width] duration-500" style={{ width: `${index * 20}%` }} />
      {STEPS.map((step, stepIndex) => {
        const complete = stepIndex < index;
        const current = stepIndex === index;
        return <li key={step} aria-current={current ? 'step' : undefined} className="relative flex min-w-0 flex-col items-center gap-2 text-center">
          <span className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold ${complete ? 'border-[#c8d3a0] bg-[#c8d3a0] text-[#24352b]' : current ? 'border-[#f0bc68] bg-[#36483a] text-[#ffe0a5] ring-4 ring-[#edb65c]/15' : 'border-white/20 bg-[#293930] text-white/35'}`}>{complete ? <Check size={14} /> : `0${stepIndex + 1}`}</span>
          <span className={`max-w-[70px] text-[8px] leading-[1.25] sm:max-w-none sm:text-[10px] ${current ? 'font-semibold text-[#ffe1a9]' : complete ? 'text-white/70' : 'text-white/40'}`}>{step}</span>
        </li>;
      })}
    </ol>
    {cancelled && <p className="mt-4 rounded-xl bg-red-400/10 px-3 py-2 text-xs text-red-200">This order was cancelled. Contact us if you need help.</p>}
  </div>;
}
