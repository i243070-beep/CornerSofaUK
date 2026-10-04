import { DEFAULT_FABRICS, type FabricSwatch } from '../fabric-options';
import { getVariantImages, type StoreProduct } from '../product-options';
import { OLD_SOFA_REMOVAL_COST, ASSEMBLY_FEE } from '../delivery-preferences';
import type { BuilderRules, BuildSelection, BuildPrice, PriceLine } from './types';

export function priceBuild(selection: BuildSelection, products: StoreProduct[], rules: BuilderRules, delivery?: number, fabrics: FabricSwatch[] = DEFAULT_FABRICS): BuildPrice {
  const errors: string[] = [], unresolved: string[] = [], specification: string[] = [], lines: PriceLine[] = [];
  const product = products.find(p => p.id === selection.productId && !rules.disabledProductIds.includes(p.id));
  const variant = product?.variants.find(v => v.id === selection.variantId);
  const policy = rules.products[selection.productId] || {};
  const add = (id: string, label: string, pounds: number, quantity = 1) => {
    const unitPence = Math.round(pounds * 100);
    if (!Number.isSafeInteger(unitPence) || unitPence < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) { errors.push(`Invalid price or quantity for ${label}.`); return; }
    lines.push({ id, label, unitPence, quantity, totalPence: unitPence * quantity });
  };
  if (!product || !variant || (policy.variantIds?.length && !policy.variantIds.includes(variant.id))) errors.push('Choose an available design and colour.');
  else {
    if (selection.shape !== 'custom' && selection.shape !== product.category && !product.categories?.includes(selection.shape)) errors.push('This design does not match the selected shape.');
    add('base', `${product.title} · ${variant.color}`, Number(variant.price));
    specification.push(`Design: ${product.title}`, `SKU / variant: ${variant.sku || variant.id}`, `Shape: ${variant.range_type}`, `Fabric / colour: ${product.materials?.join(', ') || 'As listed on product'} · ${variant.color}`, `Back: ${policy.back || 'As shown in the selected design'}`, `Orientation: ${policy.orientation || 'As shown; contact us if you need a different orientation'}`);
    if (product.dimensions_cm) specification.push(`Catalogue size: ${product.dimensions_cm.width} × ${product.dimensions_cm.depth} × ${product.dimensions_cm.height} cm`);
    if (policy.approvalRequired) unresolved.push('This design requires manufacturing approval.');
  }
  for (const group of ['feet', 'piping', 'comfort'] as const) {
    const id = selection[group];
    if (group === 'piping' && ['matching','contrast'].includes(id)) { specification.push(`Piping: ${id}${selection.pipingColour ? ` - ${selection.pipingColour}` : ''}, included`); continue; }
    if (id === 'standard') { specification.push(`${group}: standard design specification, included`); continue; }
    if (id === 'request') { unresolved.push(`Custom ${group} needs supplier confirmation and pricing.`); specification.push(`${group}: custom request${group === 'piping' ? ` (${selection.pipingColour})` : ''}`); continue; }
    const option = rules.options.find(o => o.id === id && o.group === group && o.published && o.productIds.includes(selection.productId) && (!o.variantIds?.length || o.variantIds.includes(selection.variantId)));
    if (!option) { errors.push(`Choose compatible ${group}; the previous option is no longer available.`); continue; }
    specification.push(`${group}: ${option.label}${option.finish ? ` · ${option.finish}` : ''}${option.heightMm ? ` · ${option.heightMm} mm` : ''}`);
    if (option.priceMode === 'quote_required') unresolved.push(`${option.label} awaits a supplier price.`);
    else add(option.id, option.label, option.priceMode === 'included' ? 0 : Number(option.amountPence) / 100);
  }
  if (!['standard','matching'].includes(selection.piping) && !selection.pipingColour.trim()) errors.push('Enter the requested piping colour.');
  if (selection.piping !== 'standard' && selection.pipingColour.trim()) specification.push(`Requested piping colour: ${selection.pipingColour.trim()}`);
  if (selection.customSize) {
    const entries = Object.entries(selection.dimensionsMm);
    if (!entries.length || entries.some(([,value]) => !Number.isInteger(value) || value < (policy.minMm || 100) || value > (policy.maxMm || 10000))) errors.push('Enter valid custom dimensions within the displayed limits.');
    specification.push(`Requested size: ${entries.map(([key, value]) => `${key} ${value} mm`).join(', ')}`);
    unresolved.push('Custom dimensions need manufacturing approval and a quotation.');
  }
  if (selection.shape === 'custom') { if (selection.customShape.trim().length < 10) errors.push('Describe your requested shape in at least 10 characters.'); specification.push(`Custom shape: ${selection.customShape}`); unresolved.push('Unlisted shape requires quotation.'); }
  if (selection.request || ['feet','piping','comfort'].some(group => selection[group] === 'request')) {
    if (selection.notes.trim().length < 10) errors.push('Add at least 10 characters of detail for your special request.');
    unresolved.push('Special requests need supplier confirmation.');
  }
  if (selection.notes.trim()) specification.push(`Special instructions: ${selection.notes.trim()}`);
  for (const extra of selection.extras) {
    const item = products.find(p => p.id === extra.productId), option = item?.variants.find(v => v.id === extra.variantId);
    if (!item || !option || !policy.matchingProductIds?.includes(item.id) || rules.disabledProductIds.includes(item.id)) { errors.push('A matching piece is unavailable or no longer approved for this design.'); continue; }
    add(`extra:${option.id}`, `${item.title} · ${option.color}`, Number(option.price), extra.quantity);
    specification.push(`Matching piece: ${extra.quantity} × ${item.title}, ${option.color}, SKU ${option.sku || option.id}`);
  }
  if (!selection.extras.length) specification.push('No additional matching pieces');
  const fabric = selection.fabricId ? fabrics.find(f=>f.id===selection.fabricId) : undefined;
  if (selection.fabricId && !fabric) errors.push('This fabric is no longer available. Choose another fabric.');
  if (fabric) { add('fabric', `Fabric: ${fabric.material} - ${fabric.name}`, (fabric.surchargePence||0)/100); specification.push(`Selected fabric: ${fabric.material} - ${fabric.name} (${fabric.id})`); }
  if (selection.customColour?.trim()) specification.push(`Requested upholstery colour: ${selection.customColour.trim()}`);
  const merchandisePence = lines.reduce((sum, line) => sum + line.totalPence, 0);
  if (delivery !== undefined) add('delivery', 'Postcode delivery', delivery);
  add('assembly', selection.services.floor === 'first' ? 'First-floor assembly' : 'Ground-floor assembly', selection.services.floor === 'first' ? ASSEMBLY_FEE : 0);
  if (selection.services.removal) add('removal', 'Old-sofa removal', OLD_SOFA_REMOVAL_COST);
  specification.push(`Services: ${selection.services.floor} floor; old-sofa removal ${selection.services.removal ? 'requested' : 'not requested'}`, policy.leadTime ? `Lead time: ${policy.leadTime}` : 'Delivery date to be confirmed by the delivery team');
  if (selection.access) specification.push(`Access details: ${Object.entries(selection.access).map(([key,value]) => `${key}: ${value}`).join(', ')}. Needs an access check.`);
  if (selection.roomPlan) { const room=selection.roomPlan; specification.push(`Room plan: ${room.widthMm} by ${room.lengthMm} mm; sofa position ${room.xMm}, ${room.yMm} mm; rotation ${room.rotation} degrees`, ...room.obstacles.map(o=>`${o.type}: position ${o.xMm}, ${o.yMm} mm; ${o.widthMm} by ${o.depthMm} mm`)); }
  const knownPence = lines.reduce((sum, line) => sum + line.totalPence, 0);
  const status = errors.length ? 'unavailable' : unresolved.length ? 'quote_required' : delivery === undefined ? 'estimate' : 'fixed';
  return { fabric, status, lines, merchandisePence, knownPence, totalPence: status === 'fixed' ? knownPence : null, unresolved: delivery === undefined ? [...unresolved, 'Enter a delivery postcode to confirm area charges.'] : unresolved, errors, specification, title: product ? `${product.title} · ${selection.customColour?.trim() || variant?.color || 'Choose colour'}` : 'Your bespoke sofa', image: product ? getVariantImages(product, variant)[0] : '', revision: JSON.stringify([rules.revision, lines.map(l => [l.id,l.unitPence,l.quantity]), specification]), expiresAt: undefined };
}

export function reconcileBuild(selection: BuildSelection, product: StoreProduct, rules: BuilderRules) {
  const changes: string[] = [];
  const next = { ...selection, productId: product.id, shape: selection.shape === 'custom' ? 'custom' : product.category };
  const oldColour = selection.variantId;
  const variants = product.variants.filter(v=>!rules.products[product.id]?.variantIds?.length || rules.products[product.id].variantIds!.includes(v.id));
  next.variantId = variants.some(v => v.id === oldColour) ? oldColour : variants[0]?.id || '';
  if (oldColour && next.variantId !== oldColour) changes.push('Fabric reset to an available colour for the new design.');
  for (const group of ['feet','piping','comfort'] as const) if (!['standard','request',...(group==='piping'?['matching','contrast']:[])].includes(next[group]) && !rules.options.some(o => o.id === next[group] && o.published && o.productIds.includes(product.id) && (!o.variantIds?.length || o.variantIds.includes(next.variantId)))) { next[group] = 'standard'; changes.push(`${group} reset to the included specification.`); }
  next.extras = selection.extras.filter(e => rules.products[product.id]?.matchingProductIds?.includes(e.productId));
  if (next.extras.length !== selection.extras.length) changes.push('Incompatible matching pieces removed.');
  return { selection: next, changes };
}
