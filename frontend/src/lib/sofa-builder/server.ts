import { getFabricSwatches } from '../fabric-store';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, readdir, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { isDatabaseConfigured, sql } from '../db';
import { listProducts } from '../product-store';
import { records } from '../alashi-store';
import { deliveryCharge } from '../alashi-commerce';
import { normalizeUkPostcode } from '../checkout-details';
import { priceBuild } from './pricing';
import { DEFAULT_RULES, type BuilderRules, type BuildSelection, type BuildSnapshot, type BuildQuote } from './types';

const directory = () => path.join(process.env.PRODUCT_DATA_DIR || path.join(process.cwd(), '.local-data'), 'builder');
const keyFile = (key: string) => path.join(directory(), createHash('sha256').update(key).digest('hex') + '.json');
async function table() { await sql`CREATE TABLE IF NOT EXISTS sofa_builder_records (id text PRIMARY KEY, value jsonb NOT NULL)`; }
export async function readBuilderRecord<T>(id: string): Promise<T | undefined> {
  if (isDatabaseConfigured) { await table(); const result = await sql`SELECT value FROM sofa_builder_records WHERE id=${id}`; return result[0]?.value as T | undefined; }
  try { return JSON.parse(await readFile(keyFile(id), 'utf8')).value; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
export async function writeBuilderRecord(id: string, value: unknown) {
  if (isDatabaseConfigured) { await table(); await sql`INSERT INTO sofa_builder_records (id,value) VALUES (${id},${JSON.stringify(value)}::jsonb) ON CONFLICT (id) DO UPDATE SET value=EXCLUDED.value`; return; }
  await mkdir(directory(), { recursive: true }); const file = keyFile(id), temp = file + `.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify({ id, value }), 'utf8'); await rename(temp, file);
}
export async function insertBuilderRecord<T>(id: string, value: T): Promise<T> {
  if (isDatabaseConfigured) { await table(); await sql`INSERT INTO sofa_builder_records (id,value) VALUES (${id},${JSON.stringify(value)}::jsonb) ON CONFLICT (id) DO NOTHING`; return (await readBuilderRecord<T>(id))!; }
  await mkdir(directory(), { recursive: true });
  const destination=keyFile(id), temporary=destination+`.${randomUUID()}.tmp`;
  await writeFile(temporary,JSON.stringify({id,value}),'utf8');
  try { await link(temporary,destination); } catch(error) { if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error; } finally { await unlink(temporary); }
  return (await readBuilderRecord<T>(id))!;
}
export async function getBuilderQuotes(): Promise<BuildQuote[]> {
  if (isDatabaseConfigured) { await table(); return (await sql`SELECT value FROM sofa_builder_records WHERE id LIKE 'quote:%'`).map(row => row.value as BuildQuote); }
  await mkdir(directory(), { recursive: true }); const rows = await Promise.all((await readdir(directory())).filter(f => f.endsWith('.json')).map(async f => JSON.parse(await readFile(path.join(directory(), f),'utf8'))));
  return rows.filter(row => row.id.startsWith('quote:')).map(row => row.value);
}
export async function getBuilderRules() { return await readBuilderRecord<BuilderRules>('settings') || DEFAULT_RULES; }
export function validateRules(input: unknown): BuilderRules {
  if (!input || typeof input !== 'object') throw new Error('Invalid builder settings.');
  const value = input as BuilderRules;
  if (!Array.isArray(value.disabledProductIds) || !value.disabledProductIds.every(id => typeof id === 'string') || !Array.isArray(value.options) || value.options.length > 500 || !value.products || typeof value.products !== 'object' || Array.isArray(value.products)) throw new Error('Settings must contain disabledProductIds, options and product rules.');
  const ids = new Set<string>();
  for (const option of value.options) {
    if (!option || !/^[\w-]{1,80}$/.test(option.id) || ['standard','request'].includes(option.id) || ids.has(option.id) || typeof option.label !== 'string' || !option.label.trim() || option.label.length > 120 || !['feet','piping','comfort'].includes(option.group) || !Array.isArray(option.productIds) || !option.productIds.every(id => typeof id === 'string') || typeof option.published !== 'boolean' || !['included','fixed','quote_required'].includes(option.priceMode)) throw new Error('Every option needs a unique ID, group, label, product IDs, publish status and price mode.');
    if (option.priceMode === 'fixed' && (!Number.isSafeInteger(option.amountPence) || option.amountPence! < 0 || option.amountPence! > 100000000)) throw new Error('Prices must be non-negative whole pence.');
    if (option.variantIds && (!Array.isArray(option.variantIds) || !option.variantIds.every(id => typeof id === 'string'))) throw new Error('Variant IDs must be a list.');
    if (option.image && !/^\/(?!\/)/.test(option.image)) throw new Error('Use approved local media paths for option photographs.');
    ids.add(option.id);
  }
  for (const rule of Object.values(value.products)) {
    if (!rule || typeof rule !== 'object') throw new Error('Invalid product rule.');
    for (const field of ['back','orientation','leadTime'] as const) if (rule[field] !== undefined && (typeof rule[field] !== 'string' || rule[field]!.length > 500)) throw new Error('Product descriptions must be under 500 characters.');
    for (const field of ['matchingProductIds','variantIds'] as const) if (rule[field] !== undefined && (!Array.isArray(rule[field]) || !rule[field]!.every(id => typeof id === 'string'))) throw new Error('Compatible products and variants must be lists of IDs.');
    if (rule.approvalRequired !== undefined && typeof rule.approvalRequired !== 'boolean') throw new Error('Approval required must be true or false.');
    if (rule.minMm !== undefined && (!Number.isInteger(rule.minMm) || rule.minMm < 100)) throw new Error('Invalid minimum dimension.');
    if (rule.maxMm !== undefined && (!Number.isInteger(rule.maxMm) || rule.maxMm > 10000 || rule.maxMm < (rule.minMm || 100))) throw new Error('Invalid maximum dimension.');
  }
  return JSON.parse(JSON.stringify(value));
}
export function validateSelection(input: unknown): BuildSelection {
  if (!input || typeof input !== 'object' || JSON.stringify(input).length > 18000) throw new Error('Invalid or oversized configuration.');
  const s = input as BuildSelection;
  for (const key of ['fabricId','customColour'] as const) if(s[key]!==undefined && (typeof s[key]!=='string'||s[key]!.length>150))throw new Error(`Invalid ${key}.`);
  if (s.schemaVersion !== 1) throw new Error('This saved build is from an unsupported version. Please start again.');
  for (const key of ['shape','productId','variantId','feet','piping','pipingColour','comfort','customShape','notes'] as const) if (typeof s[key] !== 'string' || s[key].length > (['notes','customShape'].includes(key) ? 2000 : 200)) throw new Error(`Invalid ${key}.`);
  if (typeof s.customSize !== 'boolean' || typeof s.request !== 'boolean' || !s.dimensionsMm || typeof s.dimensionsMm !== 'object' || Object.keys(s.dimensionsMm).some(key => !['width','depth','height','seatDepth','leftLength','rightLength'].includes(key))) throw new Error('Check your custom measurements.');
  if (!Array.isArray(s.extras) || s.extras.length > 10 || s.extras.some(e => !e || typeof e.productId !== 'string' || typeof e.variantId !== 'string' || !Number.isInteger(e.quantity) || e.quantity < 1 || e.quantity > 10) || new Set(s.extras.map(e=>e.variantId)).size !== s.extras.length) throw new Error('Check the matching-piece quantities.');
  if (!s.services || !['ground','first'].includes(s.services.floor) || typeof s.services.removal !== 'boolean') throw new Error('Choose your delivery services.');
  if (s.roomPlan) {
    const r = s.roomPlan;
    if (![r.widthMm,r.lengthMm,r.xMm,r.yMm,r.rotation].every(Number.isFinite) || r.widthMm < 1000 || r.lengthMm < 1000 || r.widthMm > 20000 || r.lengthMm > 20000 || r.xMm < 0 || r.yMm < 0 || ![0,90].includes(r.rotation) || !Array.isArray(r.obstacles) || r.obstacles.length > 10 || r.obstacles.some(o => !['door','window'].includes(o.type) || ![o.xMm,o.yMm,o.widthMm,o.depthMm].every(v=>Number.isFinite(v) && v>=0 && v<=20000))) throw new Error('Check your room plan measurements.');
  }
  if (s.access) for (const [key,value] of Object.entries(s.access)) if (!['doorwayMm','heightMm','hallwayMm','turns','lift'].includes(key) || (['turns','lift'].includes(key) ? typeof value !== 'boolean' : !Number.isInteger(value) || Number(value)<100 || Number(value)>20000)) throw new Error('Check access measurements.');
  // Only known fields are persisted; contact details never belong in anonymous builds.
  return { ...(s.fabricId?{fabricId:s.fabricId}:{}),...(s.customColour?{customColour:s.customColour.trim()}:{}), schemaVersion:1, shape:s.shape, productId:s.productId, variantId:s.variantId, feet:s.feet, piping:s.piping, pipingColour:s.pipingColour, comfort:s.comfort, customSize:s.customSize, dimensionsMm:s.dimensionsMm, customShape:s.customShape, request:s.request, notes:s.notes, extras:s.extras.map(e=>({productId:e.productId,variantId:e.variantId,quantity:e.quantity})), services:{floor:s.services.floor,removal:s.services.removal}, ...(s.roomPlan ? {roomPlan:{widthMm:s.roomPlan.widthMm,lengthMm:s.roomPlan.lengthMm,xMm:s.roomPlan.xMm,yMm:s.roomPlan.yMm,rotation:s.roomPlan.rotation,obstacles:s.roomPlan.obstacles.map(o=>({type:o.type,xMm:o.xMm,yMm:o.yMm,widthMm:o.widthMm,depthMm:o.depthMm}))}} : {}), ...(s.access ? {access:s.access} : {}) };
}
export async function serverPrice(input: unknown, postcode?: string) {
  const selection = validateSelection(input);
  const products = await listProducts(), rules = await getBuilderRules();
  let delivery: number | undefined;
  if (postcode) { const normalized = normalizeUkPostcode(postcode); if (!normalized) throw new Error('Enter a valid UK postcode.'); delivery = deliveryCharge(await records(), normalized); if (delivery === undefined) throw new Error('Please contact us to confirm delivery for this area.'); }
  return { selection, price: priceBuild(selection, products, rules, delivery, await getFabricSwatches()) };
}
export async function saveBuild(input: unknown, postcode?: string) {
  const { selection, price } = await serverPrice(input, postcode);
  if (price.errors.length) throw new Error(price.errors.join(' '));
  const build: BuildSnapshot = { id: randomBytes(24).toString('hex'), created: new Date().toISOString(), selection, price };
  await writeBuilderRecord(`build:${build.id}`, build); return build;
}
export async function getBuild(id: string) { if (!/^[a-f0-9]{48}$/.test(id)) return undefined; return readBuilderRecord<BuildSnapshot>(`build:${id}`); }

export function configurationIdentity(selection: BuildSelection) {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])) : value;
  return createHash('sha256').update(JSON.stringify(canonical({...selection,extras:[...selection.extras].sort((a,b)=>a.variantId.localeCompare(b.variantId))}))).digest('hex');
}

const limitState = globalThis as typeof globalThis & { builderRequests?: Map<string,{ count:number; reset:number }> };
export function limitBuilder(key: string, limit = 100) {
  const map = limitState.builderRequests ||= new Map(); const now=Date.now();
  for (const [id, row] of map) if (row.reset<now) map.delete(id);
  const row=map.get(key)||{count:0,reset:now+60000}; if (++row.count>limit) throw new Error('Please wait a minute before trying again.'); map.set(key,row);
}
export async function builderJson(request: Request) {
  const raw=await request.text(); if (raw.length>40000) throw new Error('Request too large.'); return JSON.parse(raw);
}
