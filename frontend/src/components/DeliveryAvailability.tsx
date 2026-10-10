'use client';
import { readApiJson } from '@/lib/api-json';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Truck, X } from 'lucide-react';

export default function DeliveryAvailability() {
  const dialog = useRef<HTMLDialogElement>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [mounted, setMounted] = useState(false);
  const [postcode, setPostcode] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  async function check(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setResult('');
    try {
      const response = await fetch(`/api/delivery/quote/?postcode=${encodeURIComponent(postcode)}`);
      const data = await readApiJson(response);
      setResult(response.ok ? `Delivery available for ${data.postcode}. ${data.delivery === 0 ? 'Free delivery' : `Delivery charge: £${Number(data.delivery).toFixed(2)}`}.` : data.error || 'Please check your postcode.');
    } catch { setResult('Could not check delivery right now. Please try again.'); }
    finally { setBusy(false); }
  }
  return <><button type="button" onClick={() => { setMounted(true); requestAnimationFrame(() => dialog.current?.showModal()); }}><Truck size={15} />Delivery Availability</button>
    {mounted && createPortal(<dialog ref={dialog} className="delivery-availability-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button type="button" className="delivery-close" aria-label="Close delivery checker" onClick={() => dialog.current?.close()}><X /></button><Truck size={30} /><p className="delivery-eyebrow">From our door to yours</p><h2>Check your delivery</h2><p>Enter your UK postcode to see availability and your area charge.</p><form onSubmit={check}><div className="delivery-postcode-boxes">{Array.from({length:7},(_,index) => <input key={index} ref={el => { inputs.current[index] = el; }} aria-label={`Delivery postcode character ${index+1}`} value={postcode[index] || ''} maxLength={7} onPaste={event => { event.preventDefault(); setPostcode(event.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7)); setResult(''); }} onChange={event => { const value=event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''); setResult(''); if(value.length>1){setPostcode(value.slice(0,7));return;} const chars=postcode.split(''); if(value)chars[index]=value;else chars.splice(index,1);setPostcode(chars.join('').slice(0,7));if(value)inputs.current[index+1]?.focus(); }} onKeyDown={event => { if(event.key==='Backspace'&&!postcode[index])inputs.current[index-1]?.focus(); }} />)}</div><button type="submit" disabled={busy} className="delivery-check-button">{busy ? 'Checking...' : 'Check availability'}</button></form>{result && <p role="status" className="delivery-result">{result}</p>}<small>Area charges follow our delivery rules. Your full address is checked before delivery approval. Assembly charges are shown at checkout.</small></dialog>,document.body)}</>;
}
