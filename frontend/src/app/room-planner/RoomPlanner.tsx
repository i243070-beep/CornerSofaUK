'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Download, ImagePlus, Layers, LoaderCircle, Move, ShoppingBag, Sofa, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatProductPrice, getColourHex, getDefaultVariant, getVariantImages, type StoreProduct } from '@/lib/product-options';
import { clamp, DEFAULT_FLOOR, validQuad, type Point, type Quad } from '@/lib/room-planner';
import { detectWallFloor } from '@/lib/room-photo-analysis';
import styles from './planner.module.css';

type Photo = { url: string; width: number; height: number; name: string };
const placementPointNames = ['Top left', 'Top right', 'Floor right', 'Floor left'];
const copyQuad = (quad: Quad) => quad.map(point => ({ ...point })) as Quad;

export default function RoomPlanner({ initialProductId = '', initialVariantId = '' }: { initialProductId?: string; initialVariantId?: string }) {
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const uploadVersion = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [placementArea, setPlacementArea] = useState<Quad>(() => copyQuad(DEFAULT_FLOOR));
  const [activeCorner, setActiveCorner] = useState(0);
  const dragCorner = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(100);
  const [previewGap, setPreviewGap] = useState(0);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [floorLine, setFloorLine] = useState(.78);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [catalogueBusy, setCatalogueBusy] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  const [catalogueRetry, setCatalogueRetry] = useState(0);
  const [category, setCategory] = useState('All');
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [preparedCutout, setCutout] = useState<{ url: string; width: number; height: number; productId: string; variantId: string } | null>(null);
  const [cutoutBusy, setCutoutBusy] = useState(false);
  const [cutoutError, setCutoutError] = useState('');
  const [cutoutRetry, setCutoutRetry] = useState(0);
  const [added, setAdded] = useState(false);
  const [exportError, setExportError] = useState('');
  const { addItem } = useCart();

  const product = products.find(item => item.id === productId);
  const variant = product?.variants.find(item => item.id === variantId);
  const cutout = preparedCutout?.productId === productId && preparedCutout?.variantId === variantId ? preparedCutout : null;
  const categories = ['All', 'Corner', '2-Seater', '3-Seater', 'Recliner'];
  const visibleProducts = products.filter(item => category === 'All' || item.category === category);

  let imageBox: { x: number; y: number; width: number; height: number } | null = null;
  if (product && photo && validQuad(placementArea)) {
    const areaLeft = Math.min(...placementArea.map(point => point.x));
    const areaRight = Math.max(...placementArea.map(point => point.x));
    const areaTop = Math.min(...placementArea.map(point => point.y));
    const areaWidth = areaRight - areaLeft;
    const sideInset = areaWidth * previewGap / 100;
    const usableWidth = Math.max(.06, areaWidth - sideInset * 2);
    let width = usableWidth * previewScale / 100;
    let height = width * photo.width / photo.height * (cutout ? cutout.height / cutout.width : .45);
    const bottom = clamp(floorLine, areaTop + .08, .98);
    const availableHeight = Math.max(.08, bottom - areaTop);
    if (height > availableHeight) {
      const fit = availableHeight / height;
      width *= fit;
      height *= fit;
    }
    const horizontalSpace = Math.max(0, usableWidth - width);
    imageBox = { x: areaLeft + sideInset + horizontalSpace / 2 + photoOffset.x / 100, y: bottom - height + photoOffset.y / 100, width, height };
    imageBox.x = clamp(imageBox.x, 0, 1 - imageBox.width);
    imageBox.y = clamp(imageBox.y, 0, 1 - imageBox.height);
  }

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => () => { uploadVersion.current++; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogueBusy(true); setCatalogueError('');
    fetch('/api/products/', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('We could not load the sofa collection.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('We could not load the sofa collection.');
      setProducts(data);
      if (initialProductId) {
        const selected = data.find((item: StoreProduct) => item.id === initialProductId);
        if (!selected) throw new Error('This sofa is no longer available.');
        setProductId(selected.id);
        setVariantId(selected.variants.find(item => item.id === initialVariantId)?.id || getDefaultVariant(selected.variants)?.id || '');
      }
    }).catch(error => { if (!controller.signal.aborted) setCatalogueError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCatalogueBusy(false); });
    return () => controller.abort();
  }, [catalogueRetry, initialProductId, initialVariantId]);

  useEffect(() => {
    if (step !== 4 || !productId || !variantId) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setCutout(null); setCutoutBusy(true); setCutoutError('');
    const timeout = window.setTimeout(() => controller.abort('timeout'), 150000);
    (async () => {
      try {
        const response = await fetch(`/api/room-planner/sofa/?product=${encodeURIComponent(productId)}&variant=${encodeURIComponent(variantId)}`, { signal: controller.signal });
        if (!response.ok) throw new Error((await response.json()).error || 'The sofa photo could not be prepared.');
        if (!response.headers.get('content-type')?.startsWith('image/png')) throw new Error('The sofa preview did not return an image.');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        const image = new Image(); image.src = objectUrl; await image.decode();
        if (!controller.signal.aborted) {
          setCutout({ url: objectUrl, width: image.naturalWidth, height: image.naturalHeight, productId, variantId });
        }
      } catch (error) {
        if (!controller.signal.aborted || controller.signal.reason === 'timeout') setCutoutError(controller.signal.reason === 'timeout' ? 'The sofa photo is taking too long. Please retry.' : error instanceof Error ? error.message : 'Please retry this preview.');
      } finally { window.clearTimeout(timeout); if (!controller.signal.aborted || controller.signal.reason === 'timeout') setCutoutBusy(false); }
    })();
    return () => { controller.abort(); window.clearTimeout(timeout); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [step, productId, variantId, cutoutRetry]);

  async function upload(file?: File) {
    if (!file) return;
    const version = ++uploadVersion.current;
    setUploadError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) { setUploadError('Choose a JPG, PNG or WebP photo under 15 MB.'); return; }
    setUploadBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (version !== uploadVersion.current) { URL.revokeObjectURL(url); return; }
      if (image.naturalWidth < 320 || image.naturalHeight < 240 || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Use a clear room photo of at least 320 × 240 pixels and under 40 megapixels.');
      const detectedFloor = clamp(detectWallFloor(image) + .04, .35, .95);
      setFloorLine(detectedFloor);
      setPlacementArea([{ x: .12, y: Math.max(.08, detectedFloor - .46) }, { x: .88, y: Math.max(.08, detectedFloor - .46) }, { x: .88, y: detectedFloor }, { x: .12, y: detectedFloor }]);
      setPhoto({ url, name: file.name, width: image.naturalWidth, height: image.naturalHeight });
      setStep(product && variant ? 3 : 2); setAdded(false); setPhotoOffset({ x: 0, y: 0 }); setPreviewScale(100); setPreviewGap(0);
    } catch (error) {
      URL.revokeObjectURL(url);
      if (version === uploadVersion.current) setUploadError(error instanceof Error ? error.message : 'This photo could not be opened.');
    } finally { if (version === uploadVersion.current) setUploadBusy(false); }
  }

  function changePoint(index: number, point: Point) {
    setPlacementArea(current => current.map((existing, itemIndex) => itemIndex === index ? { x: clamp(point.x, .01, .99), y: clamp(point.y, .01, .99) } : existing) as Quad);
  }

  function pointFromEvent(event: React.PointerEvent): Point {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }

  function continueToSofas() {
    if (!validQuad(placementArea)) return;
    setFloorLine(clamp((placementArea[2].y + placementArea[3].y) / 2, .28, .98));
    setStep(4);
  }

  function chooseProduct(next: StoreProduct) {
    setProductId(next.id); setVariantId(getDefaultVariant(next.variants)?.id || '');
    setPhotoOffset({ x: 0, y: 0 }); setPreviewScale(100); setPreviewGap(0); setAdded(false);
  }

  function addToBasket() {
    if (!product || !variant) return;
    addItem({ productId: product.id, variantId: variant.id, title: product.title, range_type: variant.range_type, color: variant.color, price: Number(variant.price), image: getVariantImages(product, variant)[0], itemType: 'sofa' });
    setAdded(true);
  }

  async function download() {
    if (!photo || !cutout || !imageBox || !product || !variant) return;
    setExportError('');
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1800 / photo.width);
      canvas.width = Math.round(photo.width * scale);
      const photoHeight = Math.round(photo.height * scale);
      canvas.height = photoHeight + 156;
      const context = canvas.getContext('2d')!;
      const room = new Image(); const sofa = new Image(); room.src = photo.url; sofa.src = cutout.url;
      await Promise.all([room.decode(), sofa.decode()]);
      context.drawImage(room, 0, 0, canvas.width, photoHeight);
      const sofaX = imageBox.x * canvas.width, sofaY = imageBox.y * photoHeight;
      const sofaWidthPixels = imageBox.width * canvas.width, sofaHeightPixels = imageBox.height * photoHeight;
      context.drawImage(sofa, sofaX, sofaY, sofaWidthPixels, sofaHeightPixels);
      context.fillStyle = '#faf9f6'; context.fillRect(0, photoHeight, canvas.width, 156); context.fillStyle = '#28352c';
      context.font = '18px sans-serif'; context.fillText(`${product.title} · ${variant.color}`, 20, photoHeight + 34, canvas.width - 40);
      context.font = '14px sans-serif';
      ['Front view · Fitted to your marked wall area', 'Visual size and spacing only. This preview does not confirm a physical fit.', 'Confirm product sizes and access before ordering.'].forEach((line, index) => context.fillText(line, 20, photoHeight + 64 + index * 28, canvas.width - 40));
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Please try downloading again.');
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'my-sofa-room-plan.png'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError('The preview could not be downloaded. Please try again.'); }
  }

  const adjustmentPanel = product ? <>
    <p className={styles.eyebrow}>04 / PLACE YOUR SOFA</p><h2>Fit sofa to wall.</h2>
    <label className={styles.field}>Move sofa up or down<input aria-label="Move photo sofa up or down" type="range" min="-35" max="35" value={photoOffset.y} onChange={event => setPhotoOffset(current => ({ ...current, y: Number(event.target.value) }))} /></label>
    <label className={styles.field}>Move sofa left or right<input aria-label="Move photo sofa left or right" type="range" min="-35" max="35" value={photoOffset.x} onChange={event => setPhotoOffset(current => ({ ...current, x: Number(event.target.value) }))} /></label>
    <label className={styles.field}>Sofa size on wall <span>{previewScale}%</span><input aria-label="Wall coverage" type="range" min="35" max="100" value={previewScale} onChange={event => setPreviewScale(Number(event.target.value))} /></label>
    <div className={styles.segment}><button aria-pressed={previewScale === 100 && previewGap === 0} onClick={() => { setPreviewScale(100); setPreviewGap(0); setPhotoOffset({ x: 0, y: 0 }); }}>Fit marked wall</button><button aria-pressed={previewScale === 92 && previewGap === 2} onClick={() => { setPreviewScale(92); setPreviewGap(2); setPhotoOffset({ x: 0, y: 0 }); }}>Small gaps</button></div>
    <label className={styles.field}>Space at both sides <span>{previewGap}%</span><input aria-label="Leave space at wall sides" type="range" min="0" max="15" value={previewGap} onChange={event => setPreviewGap(Number(event.target.value))} /></label>
    <label className={styles.field}>Sofa feet on floor <span>{Math.round(floorLine * 100)}% down photo</span><input aria-label="Wall meets floor" type="range" min="28" max="98" value={Math.round(floorLine * 100)} onChange={event => { setFloorLine(Number(event.target.value) / 100); setPhotoOffset(current => ({ ...current, y: 0 })); }} /></label>
    <button className={styles.secondary} onClick={() => setStep(3)}>Change marked wall</button>
  </> : <><p className={styles.eyebrow}>04 / PLACE YOUR SOFA</p><h2>Choose a sofa first.</h2><p>Select a sofa on the left, then its wall controls will appear here.</p></>;

  const cataloguePanel = <>
    {initialProductId ? <><h2>{product?.title || 'Your selected sofa'}</h2>{catalogueError && <p role="alert" className={styles.error}>{catalogueError}</p>}</> : <>
    <p className={styles.eyebrow}>SOFA & COLOUR</p><h2>Choose your sofa.</h2>
    <label className={styles.field}>Sofa category<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
    {catalogueBusy ? <p role="status">Loading sofas…</p> : catalogueError ? <div role="alert" className={styles.error}>{catalogueError}<button onClick={() => setCatalogueRetry(value => value + 1)}>Retry collection</button></div> : <div className={styles.productList} aria-label="Available sofas">{visibleProducts.length ? visibleProducts.map(item => <button key={item.id} aria-pressed={item.id === productId} onClick={() => chooseProduct(item)}><img src={item.images[0] || '/placeholder.svg'} alt="" /><span>{item.title}<small>{item.category} · {formatProductPrice(getDefaultVariant(item.variants)?.price || item.base_price)}</small></span>{item.id === productId && <Check size={16} />}</button>) : <p>No sofas in this category yet. Choose another category.</p>}</div>}
    </>}
    {product && <><h3>Colour <span>{variant?.color}</span></h3><div className={styles.colours} aria-label="Sofa colours">{product.variants.map(item => <button key={item.id} aria-label={item.color} aria-pressed={item.id === variantId} onClick={() => { setVariantId(item.id); setAdded(false); }}><span style={{ background: getColourHex(item) }} />{item.color}</button>)}</div>
      {!product.variants.length && <p className={styles.error}>This sofa has no colour options available yet.</p>}
      {product.dimensions_cm && <p className={styles.hint}>Catalogue size: {product.dimensions_cm.width} × {product.dimensions_cm.depth} × {product.dimensions_cm.height} cm.</p>}
      <Link className={styles.textLink} href={`/product/${product.id}/?variant=${encodeURIComponent(variantId)}`}>View sofa details <ArrowRight size={14} /></Link></>}
  </>;

  return <div className={styles.page}><div className={styles.container}>
    <Link href="/" className={styles.back}><ArrowLeft size={15} /> Back to the store</Link>
    <header className={styles.heading}><div><p className={styles.eyebrow}>YOUR SPACE. YOUR SOFA.</p><h1>Make room for <em>your favourite.</em></h1><p>{initialProductId ? 'Your sofa is selected. Add a room photo to see the preview.' : 'Mark the wall space, choose a sofa, and fit its front view clearly against the wall.'}</p></div><span className={styles.badge}><Layers size={18} /> Plan my room</span></header>
    <nav className={styles.progressSteps} aria-label="Room planner steps"><div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${(step - 1) / 3 * 100}%` }} /></div>{['Your room', 'Choose sofa', 'Set space', 'Place sofa'].map((label,index) => { const id=index+1; const done=id<step || (id===2 && !!product && !!variant); return <button key={id} aria-current={step===id ? 'step' : undefined} data-done={done} disabled={id>1 && !photo || id>2 && (!product || !variant) || id===4 && !validQuad(placementArea)} onClick={() => id===4 ? continueToSofas() : setStep(id)}><span>{done && step!==id ? <Check size={17} /> : id}</span><strong>{label}</strong></button>; })}</nav>

    <div className={`${styles.layout} ${step === 4 ? styles.placementLayout : ''}`}>
      <aside className={`${styles.controls} ${step === 4 ? styles.catalogueControls : ''}`} aria-label={step === 4 ? 'Sofa and colour choices' : 'Planner controls'}>
        {step === 1 ? <><p className={styles.eyebrow}>01 / YOUR ROOM</p><h2>Let’s see your room.</h2><p>Take a wide photo that shows the floor and the wall where you want your sofa.</p>
          <ul className={styles.tips}><li>Stand back and keep the camera level.</li><li>Use a bright photo with a clear wall and floor.</li><li>Keep the intended sofa area visible.</li></ul>
          <button className={styles.primary} onClick={() => inputRef.current?.click()} disabled={uploadBusy}><ImagePlus size={18} />{uploadBusy ? 'Opening photo…' : photo ? 'Replace room photo' : 'Upload room photo'}</button><small>Your room photo stays in this browser. Refreshing or leaving the page clears the plan.</small>
          {photo && <button className={styles.secondary} onClick={() => setStep(product && variant ? 3 : 2)}>Continue with this photo <ArrowRight size={16} /></button>}</> : step === 2 ? <><p className={styles.eyebrow}>02 / CHOOSE YOUR SOFA</p>{cataloguePanel}<button className={styles.primary} disabled={!product || !variant} onClick={() => setStep(3)}>Set space for this sofa <ArrowRight size={18} /></button></> : step === 3 ? <>
          <p className={styles.eyebrow}>03 / SET YOUR SPACE</p><h2>Show the sofa wall.</h2><p>Drag the four points around the wall space for the sofa. Put points 3 and 4 on the floor where its feet should sit.</p>
          <ol className={styles.pointGuide}>{placementPointNames.map((name, index) => <li key={name}><span>{index + 1}</span>{name}</li>)}</ol>
          <button className={styles.primary} disabled={!validQuad(placementArea)} onClick={continueToSofas}>Place my sofa <ArrowRight size={18} /></button>
          <button className={styles.secondary} onClick={() => setPlacementArea(copyQuad(DEFAULT_FLOOR))}>Reset four points</button>
          {!validQuad(placementArea) && <p role="alert" className={styles.error}>Keep the four points in order without crossing the outline.</p>}</> : cataloguePanel}
        <input ref={inputRef} type="file" aria-label="Upload room photo" accept="image/jpeg,image/png,image/webp" className={styles.hiddenFile} onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} />
        {uploadError && <p role="alert" className={styles.error}>{uploadError}</p>}
      </aside>

      <section className={styles.workspace} aria-label="Room preview">
        <div className={styles.toolbar}><span><span className={styles.liveDot} />{step === 1 ? 'Your room' : step === 2 ? 'Choose your sofa' : step === 3 ? 'Mark the wall space' : 'Front-view wall preview'}</span>{step === 4 && <span className={styles.frontBadge}>Front view</span>}</div>
        {photo ? <>{step === 3 && <div className={styles.markerTools}><label>Move point<select aria-label="Active placement point" value={activeCorner} onChange={event => setActiveCorner(Number(event.target.value))}>{placementPointNames.map((name, index) => <option key={name} value={index}>{index + 1}. {name}</option>)}</select></label><button onClick={() => setPlacementArea(copyQuad(DEFAULT_FLOOR))}>Reset points</button></div>}
          <div ref={stageRef} className={`${styles.photoStage} ${step === 3 ? styles.editing : ''}`} style={{ aspectRatio: `${photo.width}/${photo.height}` }} onPointerDown={event => { if (step !== 3 || (event.target as HTMLElement).closest('button')) return; changePoint(activeCorner, pointFromEvent(event)); }} onPointerMove={event => { if (dragCorner.current !== null) changePoint(dragCorner.current, pointFromEvent(event)); }} onPointerUp={() => { dragCorner.current = null; }} onPointerCancel={() => { dragCorner.current = null; }}>
            <img src={photo.url} alt="Your uploaded room" className={styles.roomPhoto} draggable={false} />
            {step === 4 && product && <div className={styles.floorGuide} style={{ top: `${floorLine * 100}%` }}><span>Sofa floor line</span></div>}
            {(step === 3 || step === 4) && <svg className={styles.floorOverlay} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><polygon points={placementArea.map(point => `${point.x * 1000},${point.y * 1000}`).join(' ')} fill={step === 3 ? '#86b49f30' : 'transparent'} stroke={step === 3 ? '#d7f9e0' : '#ffffff55'} strokeWidth="2" strokeDasharray="8 5" /></svg>}
            {step === 3 && placementArea.map((point, index) => <button key={index} className={styles.marker} aria-label={`Placement point ${index + 1}: ${placementPointNames[index]}`} title={`${placementPointNames[index]} — drag or use arrow keys`} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} onPointerDown={event => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); dragCorner.current = index; setActiveCorner(index); }} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); const move = event.shiftKey ? .02 : .005; changePoint(index, { x: point.x + (event.key === 'ArrowLeft' ? -move : event.key === 'ArrowRight' ? move : 0), y: point.y + (event.key === 'ArrowUp' ? -move : event.key === 'ArrowDown' ? move : 0) }); }}>{index + 1}</button>)}
            {step === 4 && imageBox && cutout && <img className={styles.sofaCutout} src={cutout.url} alt={`${product?.title} in ${variant?.color}, front view against the marked wall`} style={{ left: `${imageBox.x * 100}%`, top: `${imageBox.y * 100}%`, width: `${imageBox.width * 100}%`, height: `${imageBox.height * 100}%` }} />}
            {step === 4 && !product && <div className={styles.sceneNote}>Choose a sofa on the left to place it against the marked wall.</div>}
          </div>
          <div className={styles.photoFooter}><span><ImagePlus size={14} /> {photo.name}</span><button onClick={() => inputRef.current?.click()}>Replace photo</button><button aria-label="Remove room photo" onClick={() => { uploadVersion.current++; setPhoto(null); setStep(1); }}><X size={15} /></button></div></> : <div className={styles.emptyScene} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); upload(event.dataTransfer.files[0]); }}><div className={styles.roomDrawing} aria-hidden="true"><span /><Sofa size={92} strokeWidth={.7} /><span /></div><h2>A fresh perspective on home.</h2><p>Drop your room photo here, or choose a photo to get started.</p><button className={styles.primary} onClick={() => inputRef.current?.click()} disabled={uploadBusy}><ImagePlus size={18} />Choose a photo</button><small>JPG, PNG or WebP · up to 15 MB</small></div>}

        {step === 3 && <div className={styles.previewInfo}><Move size={19} /><p>Drag each numbered point around the wall space. Place the bottom two points on the floor where the sofa feet should sit.</p></div>}
        {step === 4 && <>{cutoutBusy && <p className={styles.busy} role="status"><LoaderCircle size={18} />Preparing your selected sofa photo. The first preview may take a minute.</p>}{cutoutError && <div role="alert" className={styles.error}>{cutoutError}<button onClick={() => setCutoutRetry(value => value + 1)}>Retry sofa photo</button></div>}
          <div className={styles.fitCard} data-testid="fit-result" aria-live="polite"><div><p className={styles.eyebrow}>FRONT-VIEW WALL PLACEMENT</p><h2>{product ? 'Fitted to your marked wall' : 'Your favourite sofa goes here.'}</h2><p>{product ? 'The sofa stays level and front-facing. Use the small controls on the right to align its feet and edges.' : 'Select a sofa and colour from the panel on the left.'}</p></div></div>
          <div className={styles.checkoutBar}><div><strong>{variant ? formatProductPrice(variant.price) : 'Choose a sofa'}</strong><small>{variant ? `${variant.color} · Available to order` : 'From the current catalogue'}</small></div><button className={styles.secondary} disabled={!cutout || !imageBox} onClick={download}><Download size={16} /> Save preview</button><button className={styles.primary} disabled={!variant || added} onClick={addToBasket}><ShoppingBag size={16} />{added ? 'Added to basket' : 'Add sofa to basket'}</button></div>
          {added && <p role="status" className={styles.success}>Your selected sofa and colour are in the basket. <Link href="/cart/">View basket →</Link></p>}{exportError && <p role="alert" className={styles.error}>{exportError}</p>}</>}
      </section>

      {step === 4 && <aside className={`${styles.controls} ${styles.adjustmentControls}`} aria-label="Sofa wall adjustment controls">{adjustmentPanel}</aside>}
    </div>
  </div></div>;
}
