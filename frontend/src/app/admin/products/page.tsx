'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPhotoUpload from '@/components/AdminPhotoUpload';
import LazyImage from '@/components/LazyImage';
import AlashiPriceRange from '@/components/AlashiPriceRange';
import { sofaImageForCategory } from '@/lib/product-images';
import { SOFA_CATEGORIES } from '@/lib/product-categories';
import { formatProductPrice, getColourHex, getSavings, type ProductVariant, type StoreProduct } from '@/lib/product-options';
import { isSofaPreviewUrl, suggestColourName } from '@/lib/sofa-preview';

type ColourForm = {
  theme?: string; key: string; id?: string; range_type: string; color: string; color_hex: string;
  price: string; stock: string; image: string; extraImages: string[];
  imageMode: 'auto' | 'original' | 'custom'; customImage: string; autoName: boolean;
  previewKey: string; previewStatus: 'pending' | 'ready' | 'error'; previewError: string; previewRetry: number;
};
type ProductForm = {
  title: string; base_price: string; compare_at_price: string; category: string;
  description: string; image: string; extraImages: string[]; variants: ColourForm[];
  width: string; depth: string; height: string;
};
const emptyForm: ProductForm = {
  title: '', base_price: '', compare_at_price: '', category: '2-Seater',
  description: '', image: '', extraImages: [], variants: [],
  width: '', depth: '', height: '',
};
const inputClass = 'admin-input w-full mt-1.5';
const labelClass = 'text-[10px] text-white/50 uppercase tracking-[0.15em]';
const validImageSource = (value: string) => /^\/(?!\/)/.test(value) || /^https?:\/\/\S+$/i.test(value);
const colourOptions = [{'name': 'Grey', 'hex': '#969b96'}, {'name': 'Black', 'hex': '#1a1a1a'}, {'name': 'Beige', 'hex': '#d4c5a9'}, {'name': 'Navy Blue', 'hex': '#263f65'}, {'name': 'Brown', 'hex': '#75452e'}, {'name': 'Cream', 'hex': '#ece6d8'}, {'name': 'Mink', 'hex': '#918071'}, {'name': 'Elephant Grey', 'hex': '#77766e'}, {'name': 'Oatmeal', 'hex': '#cbbda5'}, {'name': 'Taupe', 'hex': '#917a6b'}, {'name': 'Black & Grey', 'hex': '#454749'}, {'name': 'Charcoal', 'hex': '#484b47'}, {'name': 'Grey & Black', 'hex': '#626461'}, {'name': 'Pebble', 'hex': '#a69e90'}, {'name': 'Silver Grey', 'hex': '#b9bcb9'}, {'name': 'Tan', 'hex': '#b88c61'}, {'name': 'White', 'hex': '#fffffe'}, {'name': 'Blue', 'hex': '#497fbd'}, {'name': 'Green', 'hex': '#5f7f5a'}, {'name': 'Red', 'hex': '#be3737'}];
const shadeHex = (hex: string, light: boolean) => '#' + [1,3,5].map(i => { const channel = parseInt(hex.slice(i,i+2),16); return Math.round(light ? channel + (255-channel)*.3 : channel*.65).toString(16).padStart(2,'0'); }).join('');
const colourPreviewKey = (source: string, colour: string, theme = '') => JSON.stringify([source, colour.toLowerCase(), theme]);
const toColourForm = (variant: ProductVariant, mainImage: string): ColourForm => {
  const image = variant.images?.[0] || '';
  const generated = isSofaPreviewUrl(image);
  return {
    key: variant.id, id: variant.id, range_type: variant.range_type,
    color: variant.color, color_hex: getColourHex(variant), price: String(variant.price),
    stock: '1000', image, extraImages: variant.images?.slice(1) || [],
    imageMode: generated ? 'auto' : !image || image === mainImage ? 'original' : 'custom',
    customImage: generated ? '' : image, autoName: false,
    previewKey: generated ? colourPreviewKey(mainImage, getColourHex(variant)) : '',
    previewStatus: generated ? 'ready' : 'pending', previewError: '', previewRetry: 0,
  };
};
const previewIsReady = (variant: ColourForm, source: string) => variant.previewStatus === 'ready'
  && variant.previewKey === colourPreviewKey(source, variant.color_hex, variant.theme) && isSofaPreviewUrl(variant.image);

function AutomaticColourPhoto({ variant, source, index, onChange }: {
  variant: ColourForm; source: string; index: number;
  onChange: (key: string, source: string, colour: string, change: Partial<ColourForm>) => void;
}) {
  const ready = previewIsReady(variant, source);
  const { key, color_hex: colour, previewRetry: retry } = variant;
  useEffect(() => {
    if (ready) return;
    const controller = new AbortController();
    let active = true;
    onChange(key, source, colour, { previewStatus: 'pending', previewError: '' });
    const timeout = window.setTimeout(async () => {
      try {
        if (!validImageSource(source) || isSofaPreviewUrl(source)) {
          throw new Error('Use the original sofa photograph as the main image, then retry.');
        }
        const response = await fetch('/api/sofa-previews/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, color: colour, theme: variant.theme || '' }), signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'The colour preview could not be created. Please retry.');
        if (typeof data.url !== 'string' || !isSofaPreviewUrl(data.url)) throw new Error('The preview link could not be created. Please retry.');
        if (active) onChange(key, source, colour, {
          image: data.url, previewKey: colourPreviewKey(source, colour, variant.theme), previewStatus: 'ready', previewError: '',
        });
      } catch (error) {
        if (active && !controller.signal.aborted) onChange(key, source, colour, {
          previewStatus: 'error', previewError: error instanceof Error ? error.message : 'The colour preview could not be created. Please retry.',
        });
      }
    }, 500);
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [ready, source, colour, retry, key, onChange, variant.theme]);

  return <div className="mt-4 rounded-xl border border-blue-400/15 bg-blue-500/[0.04] p-4">
    <p className="text-xs leading-5 text-white/50">Your main sofa photograph is used to create this colour automatically.</p>
    {ready ? <>
      <LazyImage src={variant.image} alt={`${variant.color || 'Selected colour'} sofa preview`} className="mt-3 aspect-[4/3] w-full max-w-sm rounded-xl bg-white/5" imgClassName="rounded-xl object-contain" />
      <label className={`mt-4 block ${labelClass}`} htmlFor={`colour-${index}-image`}>Generated image link<input id={`colour-${index}-image`} value={variant.image} readOnly onFocus={(event) => event.target.select()} className={`${inputClass} font-mono text-xs normal-case tracking-normal`} /></label>
      <p className="mt-2 text-xs leading-5 text-white/50">Colour preview. Actual fabric may vary.</p>
    </> : variant.previewStatus === 'error' ? <div className="mt-3" role="alert">
      <p className="text-xs leading-5 text-red-300">{variant.previewError}</p>
      <button type="button" onClick={() => onChange(key, source, colour, { previewRetry: retry + 1 })} className="mt-3 rounded-lg border border-blue-400/30 bg-blue-500/15 px-3 py-2 text-xs text-blue-200 hover:bg-blue-500/25">Retry preview</button>
    </div> : <p role="status" className="mt-3 flex items-center gap-2 text-xs leading-5 text-blue-200"><span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200/25 border-t-blue-200 motion-reduce:animate-none" />Creating your colour preview. The first preview can take a little longer.</p>}
  </div>;
}

export default function AdminProductsPage() {
  const [themes, setThemes] = useState<string[]>([]);
  useEffect(() => { fetch('/api/sofa-themes/').then(r => r.json()).then(data => setThemes(data.themes || [])).catch(() => {}); }, []);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const mainPhoto = form.image.trim() || sofaImageForCategory(form.category);
  const previewsIncomplete = form.variants.some((variant) => variant.imageMode === 'auto' && !previewIsReady(variant, mainPhoto));

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products/?includeDrafts=1', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load products');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid product response');
      setProducts(data);
      setNotice(null);
    } catch {
      setNotice({ type: 'error', text: 'Products could not be loaded. Please retry.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categories = useMemo(() => ['All', ...new Set([...SOFA_CATEGORIES, ...products.map((product) => product.category)])], [products]);
  const filtered = filter === 'All' ? products : products.filter((product) => product.category === filter);
  const totalVariants = products.reduce((sum, product) => sum + (product.variants?.length || 0), 0);

  const announceChange = () => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('corner-sofa-products');
    channel.postMessage('changed');
    channel.close();
  };
  const resetEditor = () => { setForm(emptyForm); setFormError(null); setEditingId(null); setShowCreate(false); };
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(null); setShowCreate((current) => !current); };
  const openEdit = (product: StoreProduct) => {
    setShowCreate(false); setEditingId(product.id); setFormError(null);
    setForm({
      title: product.title, base_price: String(product.base_price),
      compare_at_price: product.compare_at_price == null ? '' : String(product.compare_at_price),
      category: product.category, description: product.description || '',
      image: product.images?.[0] || '', extraImages: product.images?.slice(1) || [],
      width: String(product.dimensions_cm?.width || ''), depth: String(product.dimensions_cm?.depth || ''), height: String(product.dimensions_cm?.height || ''),
      variants: (product.variants || []).map((variant) => toColourForm(variant, product.images?.[0] || sofaImageForCategory(product.category))),
    });
  };
  const changeSellingPrice = (value: string) => setForm((current) => ({
    ...current, base_price: value,
    variants: current.variants.map((variant) => variant.price.trim() && Number(variant.price) === Number(current.base_price)
      ? { ...variant, price: value } : variant),
  }));
  const changeColour = useCallback((key: string, change: Partial<ColourForm>) => setForm((current) => ({
    ...current, variants: current.variants.map((variant) => variant.key === key ? { ...variant, ...change } : variant),
  })), []);
  const changePreview = useCallback((key: string, source: string, colour: string, change: Partial<ColourForm>) => setForm((current) => {
    if ((current.image.trim() || sofaImageForCategory(current.category)) !== source) return current;
    const variant = current.variants.find((option) => option.key === key);
    if (!variant || variant.imageMode !== 'auto' || variant.color_hex !== colour) return current;
    return { ...current, variants: current.variants.map((option) => option.key === key ? { ...option, ...change } : option) };
  }), []);
  const changeSwatch = (variant: ColourForm, value: string) => changeColour(variant.key, {
    color_hex: value,
    ...((variant.autoName || !variant.color.trim()) ? { color: suggestColourName(value), autoName: true } : {}),
    ...(variant.imageMode === 'original' ? { imageMode: 'auto' as const } : {}),
  });
  const changeImageMode = (variant: ColourForm, mode: ColourForm['imageMode']) => changeColour(variant.key, {
    imageMode: mode,
    ...(mode === 'custom' ? { image: variant.customImage, previewKey: '' } : {}),
    ...(mode === 'auto' && variant.imageMode !== 'auto' ? { image: '', previewKey: '', previewError: '', previewStatus: 'pending' as const } : {}),
  });
  const addColour = () => {
    const key = crypto.randomUUID();
    setForm((current) => ({
      ...current, variants: [...current.variants, {
        key, range_type: current.category, color: suggestColourName('#d4c5a9'), color_hex: '#d4c5a9',
        price: '', stock: '1000', image: '', extraImages: [],
        imageMode: 'auto', customImage: '', autoName: true,
        previewKey: '', previewStatus: 'pending', previewError: '', previewRetry: 0,
      }],
    }));
  };
  const addColourAndShow = () => {
    addColour();
    window.setTimeout(() => document.getElementById('product-colours')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const saveProduct = async () => {
    if (saving) return;
    const basePrice = Number(form.base_price);
    const originalPrice = form.compare_at_price.trim() ? Number(form.compare_at_price) : null;
    const hasDimensions = [form.width, form.depth, form.height].some(value => value.trim());
    let error = '';
    if (!form.title.trim()) error = 'Enter a product title.';
    else if (hasDimensions && ![form.width, form.depth, form.height].every(value => value.trim() && Number(value) >= 20 && Number(value) <= 1000)) error = 'Enter all three sofa measurements in centimetres (20–1000), or leave all three blank.';
    else if (!form.base_price.trim() || !Number.isFinite(basePrice) || basePrice <= 0) error = 'Enter a selling price greater than £0.';
    else if (originalPrice != null && (!Number.isFinite(originalPrice) || originalPrice <= basePrice)) error = 'Original price must be greater than the selling price. Leave it blank for no discount.';
    else if (form.image.trim() && !validImageSource(form.image.trim())) error = 'Main image must be an http(s) URL or a local path starting with /.';
    for (const [index, variant] of form.variants.entries()) {
      if (error) break;
      const label = `Colour ${index + 1}`;
      const price = variant.price.trim() ? Number(variant.price) : basePrice;
      const variantPhoto = variant.imageMode === 'original' ? mainPhoto : variant.image.trim();
      if (!variant.color.trim()) error = `${label}: enter a colour name.`;
      else if (!/^#[0-9a-f]{6}$/i.test(variant.color_hex)) error = `${label}: select a valid colour swatch.`;
      else if (!Number.isFinite(price) || price <= 0) error = `${label}: selling price must be greater than £0, or leave it blank to use the product price.`;
      else if (originalPrice != null && originalPrice <= price) error = `${label}: original price must be greater than this colour's selling price.`;
      else if (variant.imageMode === 'auto' && !previewIsReady(variant, mainPhoto)) error = `${label}: wait for the colour preview to finish, or retry if it failed.`;
      else if (!variantPhoto) error = `${label}: add a colour photo or choose Generate from main photo.`;
      else if (!validImageSource(variantPhoto)) error = `${label}: photo must be an http(s) URL or a local path starting with /.`;
    }
    if (error) { setFormError(error); return; }
    setSaving(true); setNotice(null); setFormError(null);
    const isEditing = Boolean(editingId);
    try {
      const response = await fetch(isEditing ? `/api/products/${editingId}/` : '/api/products/', {
        method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(), base_price: basePrice, compare_at_price: originalPrice,
          category: form.category, description: form.description.trim(), status: 'published', review_confirmed: true,
          dimensions_cm: hasDimensions ? { width: Number(form.width), depth: Number(form.depth), height: Number(form.height) } : null,
          images: [mainPhoto, ...form.extraImages],
          variants: form.variants.map((variant) => ({
            ...(variant.id ? { id: variant.id } : {}), range_type: variant.range_type,
            color: variant.color.trim(), color_hex: variant.color_hex,
            price: variant.price.trim() ? Number(variant.price) : basePrice, stock: Number(variant.stock || '1000'),
            images: [variant.imageMode === 'original' ? mainPhoto : variant.image.trim(), ...variant.extraImages],
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      const saved = data.product as StoreProduct;
      setProducts((current) => isEditing ? current.map((product) => product.id === saved.id ? { ...product, ...saved } : product) : [saved, ...current]);
      setNotice({ type: 'success', text: isEditing ? 'Product updated on the public website.' : 'Product created on the public website.' });
      resetEditor(); announceChange();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Product could not be saved.');
    } finally { setSaving(false); }
  };

  const deleteProduct = async (product: StoreProduct) => {
    if (!confirm(`Delete “${product.title}”? It will be removed from the public website immediately.`)) return;
    setDeletingId(product.id); setNotice(null);
    try {
      const response = await fetch(`/api/products/${product.id}/`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed');
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice({ type: 'success', text: 'Product deleted from the admin and public website.' });
      announceChange();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Product could not be deleted.' });
    } finally { setDeletingId(null); }
  };

  const editorVisible = showCreate || Boolean(editingId);
  const savingPreview = getSavings(Number(form.base_price), form.compare_at_price.trim() ? Number(form.compare_at_price) : null);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div><h1 className="text-2xl font-light tracking-[0.15em] uppercase text-white/90">Products</h1><p className="text-xs text-white/40 mt-1">{products.length} sofas · {totalVariants} colour options</p></div>
        <div className="flex gap-2"><button onClick={fetchProducts} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs transition-colors">Refresh</button><button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs transition-colors">{showCreate ? 'Close Form' : '+ New Product'}</button></div>
      </div>

      {notice && <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${notice.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-red-500/15 text-red-300 border border-red-500/25'}`} role="status">{notice.text}</div>}

      {editorVisible && <form className="admin-card p-6 mb-6" noValidate onSubmit={(event) => { event.preventDefault(); saveProduct(); }}>
        <AlashiPriceRange key={editingId || form.category} rangeId={editingId ? `product:${editingId}` : `category:${form.category}`} label={editingId ? 'This sofa (overrides category)' : `${form.category} category default`}/>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-medium tracking-[0.1em] uppercase text-white/70">{editingId ? 'Edit Sofa' : 'Create New Sofa'}</h2><button type="button" onClick={addColourAndShow} disabled={saving} className="rounded-xl border border-blue-300/30 bg-blue-400/10 px-4 py-2.5 text-xs font-medium text-blue-100 transition-colors hover:bg-blue-400/20">+ Add colour option</button></div>
        <div className="grid md:grid-cols-2 gap-4">
          <label className={labelClass} htmlFor="product-title">Title *<input id="product-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Product name" required /></label>
          <label className={labelClass} htmlFor="product-category">Category<select id="product-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass}>{SOFA_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className={labelClass} htmlFor="product-selling-price">Selling price (£) *<input id="product-selling-price" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.base_price} onChange={(event) => changeSellingPrice(event.target.value)} className={inputClass} placeholder="0.00" required /></label>
          <div>
            <label className={labelClass} htmlFor="product-original-price">Original price (£) (optional)<input id="product-original-price" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.compare_at_price} onChange={(event) => setForm({ ...form, compare_at_price: event.target.value })} className={inputClass} placeholder="Leave blank for no discount" aria-describedby="product-discount-help" /></label>
            <p id="product-discount-help" className="mt-2 text-xs text-white/40">Set the previous price to show a discount. Clear it to remove the discount.</p>
          </div>
          {form.base_price.trim() && Number(form.base_price) > 0 && savingPreview > 0 && <div className="md:col-span-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200" aria-live="polite"><span className="mr-3 text-white/40 line-through">{formatProductPrice(Number(form.compare_at_price))}</span><strong>{formatProductPrice(Number(form.base_price))}</strong><span className="ml-3">Save {formatProductPrice(savingPreview)}</span></div>}
          <div className="md:col-span-2">
            <AdminPhotoUpload onUpload={(url) => setForm(current => ({...current, image: url}))} />{form.image && <img src={form.image} alt="Main sofa photo" className="mb-3 h-40 max-w-full rounded-xl object-contain" />}<label className={labelClass} htmlFor="product-image">Main image URL or path (optional)<input id="product-image" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} className={inputClass} placeholder="https://... or /images/sofas/your-sofa.webp" /></label>
            <p className="mt-2 text-xs leading-5 text-white/40">Add your original sofa photograph once. New colour previews are created from this image. Leave blank to use the category image.{form.extraImages.length > 0 && ` ${form.extraImages.length} additional gallery ${form.extraImages.length === 1 ? 'photo is' : 'photos are'} kept when you save.`}</p>
          </div>
          <label className={`md:col-span-2 ${labelClass}`} htmlFor="product-description">Description<textarea id="product-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} h-24 resize-none`} placeholder="Product description" /></label>
        </div>
        <fieldset className="mt-6 rounded-xl border border-white/10 p-4">
          <legend className="px-2 text-sm text-white/80">Room planner measurements (optional)</legend>
          <p className="mb-3 text-xs leading-5 text-white/50">Enter verified overall sizes, including arms and the full chaise depth for corner sofas. Leave blank if unknown; customers will be asked to confirm sizes before planning.</p>
          <div className="grid gap-4 sm:grid-cols-3">{(['width', 'depth', 'height'] as const).map(key => <label key={key} className={labelClass}>{key} (cm)<input type="number" min="20" max="1000" step="0.1" value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className={inputClass} /></label>)}</div>
        </fieldset>
        <section id="product-colours" className="mt-6 scroll-mt-6 rounded-2xl border border-blue-400/25 bg-blue-500/[0.05] p-4 sm:p-5" aria-labelledby="product-colours-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 id="product-colours-heading" className="text-sm font-medium text-white/80">Colours for this sofa</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">Add or edit the colours customers can choose on the website.</p></div>
            <button type="button" onClick={addColour} disabled={saving} className="shrink-0 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2.5 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-500/25 disabled:opacity-40">+ Add colour</button>
          </div>
          {form.variants.length === 0 && <button type="button" onClick={addColour} disabled={saving} className="mt-4 w-full rounded-xl border border-dashed border-blue-300/30 bg-blue-400/[0.06] px-4 py-5 text-left text-sm text-blue-100 transition-colors hover:bg-blue-400/[0.1]">+ Add the first colour option</button>}
          <div className="mt-4 space-y-4">
            {form.variants.map((variant, index) => <fieldset key={variant.key} disabled={saving} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <legend className="px-2 text-xs font-medium text-white/70">Colour {index + 1}{variant.color.trim() ? ` — ${variant.color}` : ''}</legend>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs text-white/40"><span className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: variant.color_hex }} aria-hidden="true" />{variant.id ? 'Existing colour' : 'New colour'}</span>
                <button type="button" onClick={() => setForm((current) => ({ ...current, variants: current.variants.filter((colour) => colour.key !== variant.key) }))} aria-label={`Remove colour ${index + 1}`} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/20">Remove</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className={labelClass} htmlFor={`colour-${index}-name`}>Colour name *<input id={`colour-${index}-name`} value={variant.color} onChange={(event) => changeColour(variant.key, { color: event.target.value, autoName: false })} className={inputClass} placeholder="e.g. Olive green" required /></label>
                <div>
                  <label className={labelClass} htmlFor={`colour-${index}-swatch`}>Swatch colour *</label>
                  <div className="mt-1.5 flex min-h-11 items-center gap-3">
                    <input id={`colour-${index}-swatch`} type="color" value={variant.color_hex} onChange={(event) => changeSwatch(variant, event.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1" />
                    <span className="font-mono text-xs text-white/50">{variant.color_hex.toUpperCase()}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" aria-label="Common sofa colours">
                    {colourOptions.map((option) => <button
                      key={option.hex}
                      type="button"
                      title={`Use ${option.name}`}
                      aria-label={`Use ${option.name}`}
                      aria-pressed={variant.color_hex.toLowerCase() === option.hex}
                      onClick={() => { changeSwatch(variant, option.hex); changeColour(variant.key, { color: option.name, autoName: false }); }}
                      className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] normal-case tracking-normal transition-colors ${variant.color_hex.toLowerCase() === option.hex ? 'border-blue-300 bg-blue-500/20 text-blue-100' : 'border-white/10 bg-white/[0.025] text-white/55 hover:border-white/25 hover:text-white/80'}`}
                    ><span className="h-3.5 w-3.5 rounded-full border border-white/25" style={{ backgroundColor: option.hex }} aria-hidden="true" />{option.name}</button>)}
                  </div>
                </div>
                <div><label className={labelClass} htmlFor={`colour-${index}-price`}>Colour selling price (£)<input id={`colour-${index}-price`} type="number" min="0.01" step="0.01" inputMode="decimal" value={variant.price} onChange={(event) => changeColour(variant.key, { price: event.target.value })} className={inputClass} placeholder={form.base_price || 'Use product price'} aria-describedby={`colour-${index}-price-help`} /></label><p id={`colour-${index}-price-help`} className="mt-2 text-xs leading-4 text-white/35">Optional. Blank uses the product selling price.</p></div>
                <p className="self-center text-xs text-emerald-200/70">Available to order</p>
                <div className="md:col-span-2 xl:col-span-4">
                  <div className="mb-5">
                    <p className={labelClass}>Colour shades</p>
                    <div className="mt-2 flex gap-2">{[true,false].map(light => <button key={String(light)} type="button" className="rounded-lg border border-white/25 bg-slate-800 px-4 py-2 text-xs text-white" onClick={() => { const base = colourOptions.find(option => variant.color.replace(/^(Light|Dark) /, '') === option.name) || { name: variant.color.replace(/^(Light|Dark) /, ''), hex: variant.color_hex }; changeSwatch(variant, shadeHex(base.hex, light)); changeColour(variant.key, { color: `${light ? 'Light' : 'Dark'} ${base.name}`, autoName: false }); }}>{light ? 'Light shade' : 'Dark shade'}</button>)}</div>
                    <label className={`mt-4 block ${labelClass}`}>Room theme for this colour<select value={variant.theme || ''} className={inputClass} onChange={event => changeColour(variant.key, { theme: event.target.value, imageMode: 'auto', previewKey: '', previewStatus: 'pending' })}><option value="">Keep original background</option>{themes.map(theme => <option key={theme} value={theme}>{theme.replace(/\.[^.]+$/, '')}</option>)}</select></label>
                    {variant.theme && <img src={`/api/sofa-themes/?file=${encodeURIComponent(variant.theme)}`} alt="Selected room background" className="mt-3 h-32 w-44 rounded-xl object-cover" />}
                    <p className="mt-2 text-xs text-white/60">Existing folder backgrounds. Each colour can have its own room theme.</p>
                  </div>
                  <fieldset>
                    <legend className={labelClass}>Sofa image</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {([
                        ['auto', 'Generate from main photo'], ['original', 'Use main photo'], ['custom', 'Use a colour photo'],
                      ] as const).map(([mode, label]) => <label key={mode} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${variant.imageMode === mode ? 'border-blue-400/40 bg-blue-500/15 text-blue-100' : 'border-white/10 bg-white/[0.025] text-white/55 hover:bg-white/5'}`}><input type="radio" name={`colour-${variant.key}-image-mode`} value={mode} checked={variant.imageMode === mode} onChange={() => changeImageMode(variant, mode)} className="h-4 w-4 accent-blue-400" />{label}</label>)}
                    </div>
                  </fieldset>
                  {variant.imageMode === 'auto' ? <AutomaticColourPhoto variant={variant} source={mainPhoto} index={index} onChange={changePreview} /> : variant.imageMode === 'original' ? <div className="mt-4">
                    <p className="text-xs leading-5 text-white/50">This colour uses your original main photograph. Choose another swatch to create a new colour preview.</p>
                    {validImageSource(mainPhoto) && <LazyImage src={mainPhoto} alt={`${variant.color || 'Original colour'} sofa photograph`} className="mt-3 h-32 w-44 rounded-xl bg-white/5" imgClassName="rounded-xl object-contain" />}
                  </div> : <div className="mt-4">
                    <AdminPhotoUpload onUpload={(url) => changeColour(variant.key, { image: url, customImage: url, imageMode: 'custom' })} /><label className={labelClass} htmlFor={`colour-${index}-image`}>Colour photo URL or path<input id={`colour-${index}-image`} value={variant.image} onChange={(event) => changeColour(variant.key, { image: event.target.value, customImage: event.target.value })} className={inputClass} placeholder="https://... or /images/sofas/your-sofa-olive.webp" aria-describedby={`colour-${index}-image-help`} /></label>
                    <p id={`colour-${index}-image-help`} className="mt-2 text-xs leading-5 text-white/40">Use your own photograph of the sofa in {variant.color.trim() || 'the selected colour'}.</p>
                    {variant.image.trim() && validImageSource(variant.image.trim()) && <LazyImage src={variant.image.trim()} alt={`${variant.color || 'Colour'} sofa photograph`} className="mt-3 h-32 w-44 rounded-xl bg-white/5" imgClassName="rounded-xl object-contain" />}
                  </div>}
                  {variant.extraImages.length > 0 && <p className="mt-2 text-xs leading-5 text-white/40">{variant.extraImages.length} additional gallery {variant.extraImages.length === 1 ? 'photo is' : 'photos are'} kept.</p>}
                </div>
              </div>
            </fieldset>)}
          </div>
        </section>
        {formError && <p role="alert" className="mt-5 rounded-xl border border-red-500/25 bg-red-500/15 px-4 py-3 text-sm text-red-300">{formError}</p>}
        {previewsIncomplete && <p id="previews-save-help" className="mt-4 text-xs leading-5 text-white/50">Finish generating each colour preview before saving. If a preview fails, retry it or choose a colour photo.</p>}
        <div className="flex justify-end gap-3 mt-5"><button type="button" onClick={resetEditor} disabled={saving} className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-2.5 rounded-xl text-xs disabled:opacity-40">Cancel</button><button type="submit" disabled={saving || previewsIncomplete} aria-describedby={previewsIncomplete ? 'previews-save-help' : undefined} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs disabled:opacity-40">{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Product'}</button></div>
      </form>}

      <div className="flex flex-wrap gap-2 mb-6">{categories.map((category, index) => <button key={category} onClick={() => setFilter(category)} className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.15em] font-medium transition-all ${filter === category ? ['bg-violet-600', 'bg-blue-600', 'bg-teal-600', 'bg-amber-600', 'bg-rose-600'][index % 5] + ' text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{category}</button>)}</div>

      {loading ? <div className="admin-card p-12 text-center"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-xs text-white/40">Loading products...</p></div>
      : filtered.length === 0 ? <div className="admin-card p-12 text-center"><p className="text-sm text-white/40">No products found.</p></div>
      : <div className="admin-table overflow-x-auto"><table className="w-full"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Variants</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}>
        <td><div className="flex items-center gap-3"><LazyImage src={product.images?.[0] || sofaImageForCategory(product.category)} alt={product.title} className="w-12 h-12 rounded-xl flex-none" imgClassName="rounded-xl" /><div><p className="text-sm text-white/80 font-medium">{product.title}</p><p className="text-[10px] text-white/30">{product.id.slice(0, 8)}...</p></div></div></td>
        <td><span className="admin-badge admin-badge-gold">{product.category}</span></td><td><span className="text-white/70">{formatProductPrice(product.base_price)}</span>{getSavings(product.base_price, product.compare_at_price) > 0 && <span className="mt-1 block text-[10px] text-emerald-300">Save {formatProductPrice(getSavings(product.base_price, product.compare_at_price))}</span>}</td><td className="text-white/40">{product.variants?.length || 0}</td>
        <td><span className="admin-badge admin-badge-green">Available</span></td>
        <td><div className="flex gap-2"><button onClick={() => openEdit(product)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold">Edit</button><button onClick={() => deleteProduct(product)} disabled={deletingId === product.id} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold disabled:opacity-40">{deletingId === product.id ? 'Deleting' : 'Delete'}</button></div></td>
      </tr>)}</tbody></table></div>}
    </div>
  );
}
