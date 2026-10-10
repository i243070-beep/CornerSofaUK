'use client';
import { readApiJson } from '@/lib/api-json';

import { useState, useEffect } from 'react';
import { Modal, Input, Button } from './ui';

interface Swatch {
  id: string;
  name: string;
  hex_color: string;
  image_url: string | null;
  material: string;
}

interface SwatchRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSwatchIds?: string[];
  onSubmit?: (data: {
    customerName: string;
    email: string;
    address: { line1: string; line2: string; city: string; postcode: string };
    swatchIds: string[];
  }) => void;
}

const MOCK_SWATCHES: Swatch[] = [
  { id: 's1', name: 'Bourneville', hex_color: '#5C3A21', image_url: null, material: 'Velvet' },
  { id: 's2', name: 'Charcoal', hex_color: '#36454F', image_url: null, material: 'Velvet' },
  { id: 's3', name: 'Beige', hex_color: '#D4C5A9', image_url: null, material: 'Linen' },
  { id: 's4', name: 'Graphite', hex_color: '#474A51', image_url: null, material: 'Velvet' },
  { id: 's5', name: 'Mushroom', hex_color: '#C4B8A8', image_url: null, material: 'Linen' },
  { id: 's6', name: 'Cream', hex_color: '#FFFDD0', image_url: null, material: 'Bouclé' },
  { id: 's7', name: 'Cognac', hex_color: '#8B4513', image_url: null, material: 'Leather' },
  { id: 's8', name: 'Black', hex_color: '#1A1A1A', image_url: null, material: 'Leather' },
  { id: 's9', name: 'Ivory', hex_color: '#FFFFF0', image_url: null, material: 'Velvet' },
  { id: 's10', name: 'Light Grey', hex_color: '#D3D3D3', image_url: null, material: 'Fabric' },
  { id: 's11', name: 'Mink', hex_color: '#8B7355', image_url: null, material: 'Leather' },
  { id: 's12', name: 'Oatmeal', hex_color: '#D4C5A0', image_url: null, material: 'Bouclé' },
];

export default function SwatchRequestModal({ isOpen, onClose, initialSwatchIds = [], onSubmit }: SwatchRequestModalProps) {
  const [swatches, setSwatches] = useState<Swatch[]>(MOCK_SWATCHES);
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [swatchSelection, setSwatchSelection] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setSwatchSelection(initialSwatchIds.slice(0, 4));
    setErrors({});
    async function fetchSwatches() {
      try {
        const res = await fetch('/api/swatches');
        if (res.ok) {
          const data = await readApiJson(res);
          if (data.length > 0) setSwatches(data);
        }
      } catch { /* use mock */ }
    }
    fetchSwatches();
  }, [isOpen]);

  const handleSwatchClick = (id: string) => {
    setSwatchSelection((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email';
    if (!addressLine1.trim()) e.address = 'Address is required';
    if (!city.trim()) e.city = 'City is required';
    if (!postcode.trim()) e.postcode = 'Postcode is required';
    if (swatchSelection.length === 0) e.swatches = 'Select at least one swatch';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/swatch-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          email,
          address: { line1: addressLine1, line2: addressLine2, city, postcode },
          swatchIds: swatchSelection,
        }),
      });

      const data = await readApiJson(res).catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Your swatch request could not be submitted. Please try again.');
      setSuccess(true);
      onSubmit?.({
        customerName,
        email,
        address: { line1: addressLine1, line2: addressLine2, city, postcode },
        swatchIds: swatchSelection,
      });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Your swatch request could not be submitted. Please try again.' });
    }
    setLoading(false);
  };

  const reset = () => {
    setCustomerName('');
    setEmail('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setPostcode('');
    setSwatchSelection([]);
    setSuccess(false);
    setErrors({});
    onClose();
  };

  const grouped = swatches.reduce<Record<string, Swatch[]>>((acc, s) => {
    (acc[s.material] ||= []).push(s);
    return acc;
  }, {});

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={reset} title="Request Submitted" size="md">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-light tracking-[0.1em] text-dark uppercase mb-2">Swatches on the way</h3>
          <p className="text-sm text-dark/60 mb-6">
            Your {swatchSelection.length} fabric swatch{swatchSelection.length !== 1 ? 'es' : ''} will be delivered to {postcode} within 5-7 working days.
          </p>
          <Button variant="contrast" size="md" onClick={reset}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Free Fabric Swatches" size="md">
      <p className="text-sm text-dark/60 mb-6 leading-relaxed">
        Select up to 4 fabric samples delivered free to your door within 5-7 working days.
      </p>

      <div className="max-h-64 overflow-y-auto mb-6 space-y-4">
        {Object.entries(grouped).map(([material, items]) => (
          <div key={material}>
            <p className="text-xs font-medium text-dark/50 uppercase tracking-widest mb-2">{material}</p>
            <div className="grid grid-cols-4 gap-2">
              {items.map((swatch) => {
                const isSelected = swatchSelection.includes(swatch.id);
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => handleSwatchClick(swatch.id)}
                    className={`p-2 rounded-lg border-2 transition-all duration-200 text-center ${
                      isSelected ? 'border-accent bg-accent/10' : 'border-gray-200 hover:border-dark/20'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-md mb-1.5" style={{ backgroundColor: swatch.hex_color }} />
                    <p className="text-[10px] text-dark/70 leading-tight">{swatch.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {errors.swatches && <p className="text-red-500 text-xs mb-4">{errors.swatches}</p>}

      {swatchSelection.length > 0 && (
        <div className="mb-4 p-3 bg-secondary/10 rounded-lg flex items-center gap-3">
          <span className="text-xs text-dark/60">{swatchSelection.length}/4 selected</span>
          <div className="flex gap-1.5">
            {swatchSelection.map((id) => {
              const s = swatches.find((sw) => sw.id === id);
              return <div key={id} className="w-6 h-6 rounded border border-dark/10" style={{ backgroundColor: s?.hex_color }} />;
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Full Name" placeholder="John Doe" value={customerName} onChange={(e) => setCustomerName(e.target.value)} error={errors.name} />
        <Input label="Email" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Input label="Address Line 1" placeholder="123 High Street" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} error={errors.address} />
        <Input label="Address Line 2 (Optional)" placeholder="Flat 2B" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" placeholder="London" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} />
          <Input label="Postcode" placeholder="SW1A 1AA" value={postcode} onChange={(e) => setPostcode(e.target.value)} error={errors.postcode} />
        </div>
        {errors.form && <p className="text-red-500 text-xs" role="alert">{errors.form}</p>}
        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
          Submit Request
        </Button>
      </form>
    </Modal>
  );
}
