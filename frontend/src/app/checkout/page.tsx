'use client';
import { readApiJson } from '@/lib/api-json';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Banknote, Check, CheckCircle2, MapPin, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button, Input } from '@/components/ui';
import { checkCustomerDetails, EMPTY_CUSTOMER, normalizeUkPostcode, type CustomerDetails } from '@/lib/checkout-details';
import { formatProductPrice } from '@/lib/product-options';
import type { LocalOrder } from '@/lib/local-orders';
import { saveOrderAccess } from '@/lib/order-tracking';
import { earliestDeliveryDate, validDeliveryDate, OLD_SOFA_REMOVAL_COST } from '@/lib/delivery-preferences';
import BuildSpecification from '@/components/sofa-builder/BuildSpecification';
import OrderConfirmation from '@/components/OrderConfirmation';

const STEP_NAMES = ['Your sofa', 'Postcode', 'Delivery', 'Confirm'];
const ORDER_ID_PATTERN = /^[A-Z0-9]{6}$/;

function OrderSteps({ step }: { step: number }) {
  return <ol aria-label="Checkout steps" className="relative grid grid-cols-4 gap-1 py-3">
    <div className="absolute left-[12%] right-[12%] top-[27px] h-px bg-white/15" aria-hidden="true" />
    <div className="absolute left-[12%] top-[27px] h-px bg-gradient-to-r from-[#efaa47] to-[#d6c78d] transition-[width] duration-500" style={{ width: `${Math.max(0, (step - 1) * 25)}%` }} aria-hidden="true" />
    {STEP_NAMES.map((name, index) => {
      const number = index + 1;
      const done = number < step;
      return <li key={name} aria-current={number === step ? 'step' : undefined} className="relative flex min-w-0 flex-col items-center gap-2 text-center">
        <span className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${done ? 'border-[#e4c27b] bg-[#e4c27b] text-[#25362d]' : number === step ? 'border-[#efaa47] bg-[#26392f] text-[#ffd18b] ring-4 ring-[#e4c27b]/15' : 'border-white/25 bg-[#26392f] text-white/45'}`}>{done ? <Check size={14} /> : number}</span>
        <span className={`text-[9px] leading-tight sm:text-[11px] ${number === step ? 'font-semibold text-[#ffe1a8]' : done ? 'text-white/75' : 'text-white/45'}`}>{name}</span>
      </li>;
    })}
  </ol>;
}

function PostcodeBoxes({ value, onChange, onBlur }: { value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  const changeAt = (index: number, input: string) => {
    const chars = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const result = compact.split('');
    if (chars.length > 1) {
      const pasted = chars.slice(0, 7);
      for (let i = 0; i < pasted.length; i++) result[i] = pasted[i];
      onChange(result.join('').slice(0, 7));
      refs.current[Math.min(pasted.length, 6)]?.focus();
      return;
    }
    if (chars) result[index] = chars;
    else result.splice(index, 1);
    const next = result.join('').slice(0, 7);
    onChange(next);
    if (chars && index < 6) refs.current[index + 1]?.focus();
  };

  return <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) onBlur?.(); }}>
    {Array.from({ length: 7 }, (_, index) => <input
      key={index}
      ref={element => { refs.current[index] = element; }}
      aria-label={`Postcode character ${index + 1}`}
      autoComplete={index === 0 ? 'postal-code' : 'off'}
      autoCapitalize="characters"
      inputMode="text"
      maxLength={7}
      value={compact[index] || ''}
      onChange={event => changeAt(index, event.target.value)}
      onPaste={event => { event.preventDefault(); changeAt(0, event.clipboardData.getData('text')); }}
      onKeyDown={event => {
        if (event.key === 'Backspace' && !compact[index] && index > 0) refs.current[index - 1]?.focus();
        if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
        if (event.key === 'ArrowRight' && index < 6) refs.current[index + 1]?.focus();
      }}
      className={`h-12 w-10 rounded-xl border-2 text-center font-mono text-lg font-semibold uppercase text-[#23372d] shadow-sm outline-none transition sm:h-14 sm:w-12 sm:text-xl ${compact[index] ? 'border-[#889f80] bg-[#e5efe0] focus:border-[#db9940]' : 'border-[#d5c8ab] bg-white focus:border-[#db9940]'}`}
    />)}
  </div>;
}

function CharacterOrderNumber({ id }: { id: string }) {
  const value = ORDER_ID_PATTERN.test(id) ? id.split('') : id.split('');
  return <div aria-label={`Order reference ${id}`} className="flex flex-wrap items-center gap-1.5">
    {value.map((character, index) => <span key={`${character}-${index}`} className="flex h-10 w-9 items-center justify-center rounded-lg border border-[#e8c47d]/60 bg-gradient-to-b from-[#fff5dd] to-[#ebd09c] font-mono text-lg font-bold tracking-wide text-[#304237] shadow-[0_3px_12px_rgba(68,52,27,.12)]">{character}</span>)}
  </div>;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, itemCount, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [postcodeInput, setPostcodeInput] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>();
  const [assemblyFloor, setAssemblyFloor] = useState<'ground' | 'first'>('ground');
  const [customer, setCustomer] = useState<CustomerDetails>({ ...EMPTY_CUSTOMER });
  const [deliveryPreference, setDeliveryPreference] = useState<'asap' | 'date'>('asap');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [removeOldSofa, setRemoveOldSofa] = useState(false);
  const removalCost = removeOldSofa ? OLD_SOFA_REMOVAL_COST : 0;
  const [busy, setBusy] = useState(false);
  const [checkingPostcode, setCheckingPostcode] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetails, string>>>({});
  const [receipt, setReceipt] = useState<LocalOrder>();
  const [verifiedAddress, setVerifiedAddress] = useState('');
  const submitting = useRef(false);
  const attempt = useRef({ payload: '', key: '' });
  const assemblyCost = assemblyFloor === 'first' ? 20 : 0;
  const orderTotal = Math.round((total + (deliveryFee || 0) + assemblyCost + removalCost) * 100) / 100;
  const hasSofa = items.some(item => item.itemType !== 'swatch');
  const postcode = normalizeUkPostcode(postcodeInput);
  const builderDefaultsApplied = useRef(false);
  useEffect(() => { if (builderDefaultsApplied.current || !items.length) return; const builds=items.filter(item=>item.buildSnapshot); if(builds.length){setAssemblyFloor(builds.some(item=>item.buildSnapshot!.selection.services.floor==='first')?'first':'ground');setRemoveOldSofa(builds.some(item=>item.buildSnapshot!.selection.services.removal));} builderDefaultsApplied.current=true; },[items]);


  async function checkPostcode() {
    setError('');
    if (!postcode) { setErrors(current => ({ ...current, postcode: 'Enter a valid UK postcode, for example SW1A 1AA.' })); return; }
    setCheckingPostcode(true);
    try {
      const response = await fetch(`/api/delivery/quote/?postcode=${encodeURIComponent(postcode)}`, { cache: 'no-store' });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.error || 'We could not check that postcode.');
      setCustomer(current => ({ ...current, postcode: result.postcode }));
      setPostcodeInput(result.postcode.replace(/\s/g, ''));
      setDeliveryFee(result.delivery);
      setVerifiedAddress('');
      setErrors(current => ({ ...current, postcode: undefined }));
    } catch (failure) {
      setDeliveryFee(undefined);
      setErrors(current => ({ ...current, postcode: failure instanceof Error ? failure.message : 'We could not check that postcode.' }));
    } finally { setCheckingPostcode(false); }
  }

  async function continueFromDetails() {
    if (deliveryPreference === 'date' && !validDeliveryDate(requestedDeliveryDate)) { setError('Choose a delivery date at least four days from today.'); setStep(3); return; }
    const checked = checkCustomerDetails(customer);
    setErrors(checked.errors);
    if (!checked.valid) {
      const first = Object.keys(checked.errors)[0] as keyof CustomerDetails | undefined;
      if (first) document.getElementById(`checkout-${first}`)?.focus();
      return;
    }
    if (!(await validateAddress(checked.customer.postcode, checked.customer.city))) return;
    setStep(4);
    setError('');
    window.scrollTo(0, 0);
  }

  async function validateAddress(postcodeValue: string, cityValue: string) {
    setVerifiedAddress('');
    try {
      const response = await fetch('/api/address/validate/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postcode: postcodeValue, city: cityValue }) });
      const result = await readApiJson(response);
      if (!response.ok || !result.valid) {
        setErrors(current => ({ ...current, [result.field === 'city' ? 'city' : 'postcode']: result.message || 'Please check your town or city and postcode.' }));
        if (response.status === 503) { setError(result.message); setStep(3); }
        else setStep(result.field === 'city' ? 3 : 2);
        return false;
      }
      setErrors(current => ({ ...current, postcode: undefined, city: undefined }));
      setVerifiedAddress(`${result.postcode}|${result.townOrCity.toLocaleLowerCase('en-GB')}`);
      setCustomer(current => ({ ...current, postcode: result.postcode, city: result.townOrCity }));
      return true;
    } catch {
      setErrors(current => ({ ...current, postcode: 'Could not check your details. Please try again.' }));
      setStep(2);
      return false;
    }
  }

  async function confirmOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (deliveryPreference === 'date' && !validDeliveryDate(requestedDeliveryDate)) { setError('Choose a delivery date at least four days from today.'); setStep(3); return; }
    const checked = checkCustomerDetails(customer);
    setErrors(checked.errors);
    if (!checked.valid || deliveryFee === undefined || !postcode) { setStep(2); setError('Check your postcode and delivery details before confirming.'); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    const payload = JSON.stringify({ items, customerDetails: checked.customer, assemblyFloor, deliveryPreference, requestedDeliveryDate, deliveryInstructions, removeOldSofa });
    if (attempt.current.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
    try {
      if (!(await validateAddress(checked.customer.postcode, checked.customer.city))) return;
      const response = await fetch('/api/orders/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...JSON.parse(payload), checkoutKey: attempt.current.key }) });
      const result = await readApiJson(response);
      if (!response.ok) {
        if (result.errors) setErrors(result.errors);
        if (response.status === 409) attempt.current = { payload: '', key: '' };
        throw new Error(result.error || 'Your order could not be saved. Please try again.');
      }
      if (!result.order?.id || !result.order?.trackingToken) throw new Error('Your order confirmation could not be read. Please contact us before retrying.');
      setReceipt(result.order);
      saveOrderAccess({ id: result.order.id, token: result.order.trackingToken });
      try { sessionStorage.setItem(`sofa-order-${result.order.id}`, JSON.stringify(result.order)); } catch {}
      try { const channel = new BroadcastChannel('corner-sofa-orders'); channel.postMessage({ type: 'created' }); channel.close(); } catch {}
      clearCart();
      window.scrollTo(0, 0);
      router.replace(`/checkout/success?order_id=${encodeURIComponent(result.order.id)}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your order could not be saved. Please try again.'); }
    finally { submitting.current = false; setBusy(false); }
  }

  if (receipt) return <OrderConfirmation order={receipt} />;
  if (!items.length || !hasSofa) return <section className="min-h-[500px] px-5 py-24 text-center"><h1 className="mb-4 font-serif text-4xl">{items.length ? 'Add a sofa first' : 'Your basket is empty'}</h1><p className="mb-7 text-sm">Choose your sofa, confirm your delivery details and pay when it arrives.</p><Link href="/products" className="inline-flex rounded-full bg-[#344536] px-7 py-3 text-white">Browse sofas</Link></section>;

  const fields: { key: Exclude<keyof CustomerDetails, 'postcode'>; label: string; type?: string; autoComplete: string; placeholder: string; maxLength: number }[] = [
    { key: 'name', label: 'Full name', autoComplete: 'name', placeholder: 'Your full name', maxLength: 120 },
    { key: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com', maxLength: 254 },
    { key: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel', placeholder: '07123 456789', maxLength: 30 },
    { key: 'address', label: 'Address', autoComplete: 'address-line1', placeholder: 'House number or name and street', maxLength: 250 },
    { key: 'city', label: 'Town or city', autoComplete: 'address-level2', placeholder: 'Town or city', maxLength: 100 },
  ];

  return <section className="commerce-studio commerce-checkout bg-[#f2f4ef] px-4 py-8 text-[#283b30] sm:px-6 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-[28px] bg-[#20342b] px-4 py-5 text-[#f8f4e9] shadow-[0_22px_70px_rgba(26,40,31,.16)] sm:px-9 sm:py-7">
        <div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[#e7bd73]">A few easy steps</p><h1 className="mt-1 font-serif text-2xl sm:text-3xl">Make it yours</h1></div><span className="rounded-full border border-white/15 bg-white/[.04] px-3 py-1.5 text-[10px] text-white/75">{itemCount} {itemCount === 1 ? 'sofa' : 'sofas'}</span></div>
        <OrderSteps step={step} />
      </div>

      <form noValidate onSubmit={confirmOrder} className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-5">
          {step === 1 && <section className="rounded-3xl border border-[#dce3d8] bg-white p-5 shadow-sm sm:p-7">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8b6940]"><PackageCheck size={15} />Your sofa</p><h2 className="mb-5 font-serif text-3xl">Start with the good part.</h2>
            {items.map(item => <div key={item.productId + item.variantId} className="flex gap-4 border-b border-[#e7ebe3] py-4 last:border-0"><img src={item.image} alt={item.title} className="h-24 w-24 shrink-0 rounded-2xl bg-[#f1f2ed] object-contain sm:h-28 sm:w-28" /><div className="min-w-0 flex-1 self-center"><h3 className="font-medium">{item.title}</h3><p className="mt-1 text-xs text-[#6c7869]">{item.range_type} · {item.color} · Quantity {item.quantity}</p><p className="mt-3 font-medium">{formatProductPrice(item.price * item.quantity)}</p></div></div>)}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><Link href="/cart" className="text-xs text-[#61705f] underline underline-offset-4">Change my basket</Link><button type="button" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#284236] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#1d3228]">Check my postcode <ArrowRight size={17} /></button></div>
          </section>}

          {step === 2 && <section className="rounded-3xl border border-[#dce3d8] bg-white p-5 shadow-sm sm:p-8">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8b6940]"><MapPin size={15} />Delivery area</p><h2 className="font-serif text-3xl">Where are we taking it?</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[#64725e]">Add your UK postcode. We’ll show any area delivery charge before you confirm.</p>
            <div className="my-8"><PostcodeBoxes value={postcodeInput} onChange={value => { setPostcodeInput(value); setDeliveryFee(undefined); setVerifiedAddress(''); setErrors(current => ({ ...current, postcode: undefined })); }} onBlur={() => { if (postcode) void checkPostcode(); }} /></div>
            {errors.postcode && <p role="alert" className="mb-4 text-center text-sm text-red-700">{errors.postcode}</p>}
            {deliveryFee !== undefined && <div role="status" className="mb-5 rounded-2xl border border-[#d4dfcc] bg-gradient-to-r from-[#f0f4e9] to-[#fbf8ee] p-4 text-center"><p className="text-sm font-semibold">{deliveryFee === 0 ? 'Free UK delivery' : `Area delivery · ${formatProductPrice(deliveryFee)}`}</p><p className="mt-1 text-xs text-[#6b7867]">Delivery for {customer.postcode}. The final total is shown before you confirm.</p></div>}
            <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => { setStep(1); setError(''); window.scrollTo(0, 0); }} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm text-[#5b6a58]"><ArrowLeft size={16} />Back to sofa</button><button type="button" disabled={checkingPostcode} onClick={() => { if (deliveryFee === undefined) void checkPostcode(); else { setStep(3); setError(''); window.scrollTo(0, 0); } }} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#284236] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#1d3228] disabled:opacity-60">{checkingPostcode ? 'Checking…' : deliveryFee === undefined ? 'Check delivery' : 'Delivery details'} <ArrowRight size={16} /></button></div>
            {deliveryFee !== undefined && <button type="button" disabled={checkingPostcode} onClick={() => { setPostcodeInput(''); setDeliveryFee(undefined); setVerifiedAddress(''); setCustomer(current => ({ ...current, postcode: '' })); setErrors(current => ({ ...current, postcode: undefined })); setError(''); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Postcode character 1"]')?.focus()); }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#d8dfd5] text-sm font-medium text-[#344536] transition hover:bg-[#f2f5ee]">{checkingPostcode ? 'Checking...' : 'Check again'} <ArrowRight size={16} /></button>}
          </section>}

          {step === 3 && <section className="rounded-3xl border border-[#dce3d8] bg-white p-5 shadow-sm sm:p-8">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8b6940]"><Truck size={15} />Your delivery</p><h2 className="font-serif text-3xl">How should we bring it in?</h2><p className="mb-5 mt-2 text-sm leading-6 text-[#64725e]">Choose the floor for your sofa. Ground-floor assembly is on us.</p>
            <fieldset><legend className="sr-only">Choose delivery floor</legend><div className="grid gap-3 sm:grid-cols-2">
              {[{ id: 'ground', title: 'Ground floor', detail: 'Delivery and assembly included', price: 'FREE', Icon: CheckCircle2 }, { id: 'first', title: 'First floor', detail: 'Delivery and assembly upstairs', price: '+ £20', Icon: Truck }].map(option => <label key={option.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${assemblyFloor === option.id ? 'border-[#758b6e] bg-[#eef3e9] ring-2 ring-[#758b6e]/15' : 'border-[#e2e7df] hover:border-[#aebba5]'}`}><input type="radio" name="assemblyFloor" className="mt-1 accent-[#344536]" checked={assemblyFloor === option.id} onChange={() => setAssemblyFloor(option.id as 'ground' | 'first')} /><option.Icon size={19} className="mt-0.5 shrink-0 text-[#64795b]" /><span className="min-w-0 flex-1"><strong className="block text-sm">{option.title}</strong><small className="mt-1 block text-xs text-[#6b7867]">{option.detail}</small></span><b className="shrink-0 text-xs text-[#465d42]">{option.price}</b></label>)}
            </div></fieldset>
            <fieldset className="mt-6"><legend className="mb-3 text-xs font-semibold uppercase tracking-widest">Delivery day</legend><div className="grid gap-3 sm:grid-cols-2">{[{id:'asap', title:'As soon as possible', detail:'The delivery team will arrange your earliest slot'}, {id:'date',title:'Choose a day',detail:'Any day at least four days ahead'}].map(option => <label key={option.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${deliveryPreference === option.id ? 'border-[#b89650] bg-[#faf2df]' : 'border-[#d8dfd3]'}`}><input type="radio" name="delivery-day" checked={deliveryPreference === option.id} onChange={() => { setDeliveryPreference(option.id as 'asap' | 'date'); setError(''); }} /><span><strong className="block text-sm">{option.title}</strong><small className="mt-1 block text-xs text-[#64725e]">{option.detail}</small></span></label>)}</div>{deliveryPreference === 'date' && <label className="mt-4 block text-sm">Preferred delivery date<input type="date" required min={earliestDeliveryDate()} value={requestedDeliveryDate} onChange={event => setRequestedDeliveryDate(event.target.value)} className="mt-2 block w-full rounded-xl border border-[#d8dfd3] bg-white p-3" /><small className="mt-2 block text-[#64725e]">Earliest: {earliestDeliveryDate()}. Your requested date is subject to delivery-team approval.</small></label>}</fieldset>
            <details className="mt-4 rounded-xl border border-[#d8dfd3] p-4"><summary className="cursor-pointer text-sm">Add delivery instructions (optional)</summary><label className="mt-3 block text-sm">Access, parking or other helpful details<textarea maxLength={1000} rows={3} value={deliveryInstructions} onChange={event => setDeliveryInstructions(event.target.value)} className="mt-2 w-full rounded-lg border border-[#d8dfd3] p-3" /></label></details>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#b7c6aa] bg-[#edf3e5] p-4"><input type="checkbox" checked={removeOldSofa} onChange={event => setRemoveOldSofa(event.target.checked)} className="mt-1 accent-[#344536]" /><span className="flex-1"><strong className="block text-sm">Remove my old sofa</strong><small className="mt-1 block text-xs text-[#64725e]">Add old-sofa removal to your delivery.</small></span><strong className="text-sm">{formatProductPrice(OLD_SOFA_REMOVAL_COST)}</strong></label>
            <div className="my-7 h-px bg-[#e5e9e2]" />
            <h3 className="mb-4 font-serif text-2xl">Where can we reach you?</h3><div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <div key={field.key} className={field.key === 'address' ? 'sm:col-span-2' : ''}><Input id={`checkout-${field.key}`} label={field.label} type={field.type || 'text'} autoComplete={field.autoComplete} required maxLength={field.maxLength} placeholder={field.placeholder} onBlur={field.key === 'city' ? () => { if (customer.postcode && customer.city) void validateAddress(customer.postcode, customer.city); } : undefined} value={customer[field.key]} onChange={event => { setVerifiedAddress(''); setCustomer({ ...customer, [field.key]: event.target.value }); setErrors({ ...errors, [field.key]: undefined }); }} error={errors[field.key]} />{field.key === 'city' && verifiedAddress.endsWith(`|${customer.city.trim().toLocaleLowerCase('en-GB')}`) && !errors.city && <p className="mt-1 text-xs font-medium text-[#54744f]">Postcode format checked — address checked before delivery approval</p>}</div>)}</div>
            <p className="mt-4 rounded-xl bg-[#f6f7f3] px-4 py-3 text-xs text-[#62715f]">Delivery postcode <strong className="ml-1 text-[#344536]">{customer.postcode || postcode}</strong></p>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm text-[#5b6a58]"><ArrowLeft size={16} />Change postcode</button><button type="button" onClick={continueFromDetails} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#284236] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#1d3228]">Review my order <ArrowRight size={17} /></button></div>
          </section>}

          {step === 4 && <section className="rounded-3xl border border-[#dce3d8] bg-white p-5 shadow-sm sm:p-8">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8b6940]"><ShieldCheck size={15} />All set</p><h2 className="font-serif text-3xl">One last look.</h2><p className="mt-2 text-sm leading-6 text-[#64725e]">Please check your delivery address and total. Nothing is paid online.</p>
            <div className="mt-6 divide-y divide-[#e6ebe3] rounded-2xl border border-[#e1e7dd] px-4">{items.map(item => <div key={item.productId + item.variantId} className="flex justify-between gap-4 py-4 text-sm"><span className="min-w-0"><strong className="block">{item.title}</strong>{item.buildSnapshot && <BuildSpecification build={item.buildSnapshot} compact />}<small className="text-[#687564]">{item.range_type} · {item.color} · Qty {item.quantity}</small></span><b className="shrink-0">{formatProductPrice(item.price * item.quantity)}</b></div>)}</div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2"><div className="rounded-2xl bg-[#f4f6f1] p-4 text-sm"><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#829078]">Deliver to</p><strong>{customer.name}</strong><p>{customer.address}<br />{customer.city}, {customer.postcode}</p><p className="mt-2 text-xs text-[#64725e]">{customer.email}<br />{customer.phone}</p></div><div className="rounded-2xl bg-[#f4f6f1] p-4 text-sm"><p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#829078]">Delivery service</p><p className="mb-2">{deliveryPreference === "date" ? `Requested date: ${requestedDeliveryDate}` : "As soon as possible"} (subject to approval)</p>{deliveryInstructions && <p className="mb-2 whitespace-pre-wrap">{deliveryInstructions}</p>}{removeOldSofa && <p className="mb-2">Old-sofa removal: {formatProductPrice(removalCost)}</p>}<p>{deliveryFee === 0 ? 'Standard UK delivery · Free' : `Area delivery · ${formatProductPrice(deliveryFee!)}`}</p><p className="mt-1">{assemblyFloor === 'ground' ? 'Ground-floor assembly · Free' : 'First-floor assembly · £20'}</p></div></div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => { setStep(3); setError(''); window.scrollTo(0, 0); }} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm text-[#5b6a58]"><ArrowLeft size={16} />Edit details</button><Button type="submit" variant="contrast" loading={busy} disabled={busy} className="min-h-12 !w-auto rounded-full px-7">Confirm order · pay on delivery <ArrowRight className="ml-2 inline" size={16} /></Button></div>
          </section>}
        </div>

        <aside className="rounded-3xl border border-[#dce3d8] bg-white p-5 shadow-sm lg:sticky lg:top-28">
          <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e4] text-[#465d42]"><Banknote size={20} /></span><div><h2 className="font-serif text-xl">Your total</h2><p className="text-[11px] text-[#72806c]">Cash on delivery</p></div></div>
          <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt>Subtotal</dt><dd>{formatProductPrice(total)}</dd></div><div className="flex justify-between gap-3"><dt>Delivery</dt><dd>{deliveryFee === undefined ? 'Check postcode' : deliveryFee === 0 ? 'Free' : formatProductPrice(deliveryFee)}</dd></div><div className="flex justify-between gap-3"><dt>Assembly · {assemblyFloor === 'ground' ? 'ground floor' : 'first floor'}</dt><dd>{assemblyCost === 0 ? 'Free' : formatProductPrice(assemblyCost)}</dd></div><div className="flex justify-between gap-3"><dt>Old-sofa removal</dt><dd>{removeOldSofa ? formatProductPrice(removalCost) : "Not requested"}</dd></div><div className="flex justify-between gap-3 border-t border-[#e0e6dc] pt-4 font-semibold"><dt>Due on delivery</dt><dd>{formatProductPrice(orderTotal)}</dd></div><div className="flex justify-between gap-3 text-xs text-[#54744f]"><dt>Pay online today</dt><dd>£0.00</dd></div></dl>
          <div className="mt-4 rounded-xl bg-gradient-to-br from-[#edf2e8] to-[#faf5e9] p-3 text-xs leading-5 text-[#566651]"><CheckCircle2 size={14} className="mr-1 inline text-[#6b885c]" />The delivery team will add your date and time after they approve your order.</div>
          {step === 1 && <button type="button" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#284236] text-sm font-semibold text-white transition hover:bg-[#1d3228]">Continue <ArrowRight size={16} /></button>}
        </aside>
      </form>
      {step === 1 && <p className="mx-auto mt-5 flex max-w-5xl items-center justify-center gap-2 text-center text-xs text-[#667260]"><CheckCircle2 size={15} className="text-[#6a855f]" />Secure checkout · No online payment · Free ground-floor assembly</p>}
    </div>
  </section>;
}
