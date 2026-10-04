import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { priceRange, type AlashiRecord, type DeliveryZone } from './alashi-store';
import { getDefaultVariant, getProductPrice, type StoreProduct } from './product-options';
const fallbackSecret = randomBytes(32).toString('hex');
function secret(){return process.env.ALASHI_SIGNING_SECRET || process.env.TOKEN_SECRET || (process.env.ADMIN_PASSWORD ? `alashi:${process.env.ADMIN_PASSWORD}` : fallbackSecret);}
export function signAlashi(value:object){const payload=Buffer.from(JSON.stringify({...value,expires:Date.now()+86400000})).toString('base64url');return payload+'.'+createHmac('sha256',secret()).update(payload).digest('base64url');}
export function readAlashi<T>(token:unknown):T|undefined {
  if(typeof token!=='string'||token.length>30000)return;
  const [payload,signature,...extra]=token.split('.');if(!payload||!signature||extra.length)return;
  const expected=createHmac('sha256',secret()).update(payload).digest();const supplied=Buffer.from(signature,'base64url');
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return;
  try{const value=JSON.parse(Buffer.from(payload,'base64url').toString());return value.expires>Date.now()?value:undefined;}catch{return;}
}
export type Offer = {type:'offer';productId:string;variantId:string;price:number;cataloguePrice:number;expires?:number};
export type Conversation = {type:'conversation';selected:string[];shown:string[];offers:Record<string,number>;query:string;stage?:'browsing'|'summary'|'checkout';turn?:number;lastAnswer?:string;colour?:string;imageHash?:string};
export function quoteProduct(product:StoreProduct,data:AlashiRecord[],previous?:number,negotiate=false,colour='') {
  const variant=product.variants.find(v=>colour && v.color.toLowerCase()===colour.toLowerCase())||getDefaultVariant(product.variants);
  const cataloguePrice=Number(variant?.price || getProductPrice(product));
  const range=priceRange(data,product.id,product.category);
  const normal=range?Math.min(range.max,Math.max(range.min,cataloguePrice)):cataloguePrice;
  const minimum=range?.floor ?? normal;
  const prior=typeof previous==='number'?Math.max(minimum,Math.min(normal,previous)):normal;
  const price=negotiate && range?.floor!==undefined ? (prior-minimum <= Math.max(1,(normal-minimum)/4) ? minimum : Math.round((prior+minimum)*50)/100) : prior;
  const offer:Offer={type:'offer',productId:product.id,variantId:variant?.id||'',price,cataloguePrice};
  return {price,variant,range:range?{min:range.min,max:range.max}:{min:cataloguePrice,max:cataloguePrice},offerToken:variant?signAlashi(offer):undefined};
}
export function validOffer(token:unknown,product:StoreProduct,variantId:string,data:AlashiRecord[]):number|undefined {
  const offer=readAlashi<Offer>(token);const variant=product.variants.find(v=>v.id===variantId);
  if(!offer||offer.type!=='offer'||offer.productId!==product.id||offer.variantId!==variantId||!variant||offer.cataloguePrice!==Number(variant.price))return;
  const range=priceRange(data,product.id,product.category);
  const minimum=range?.floor ?? (range?Math.min(range.max,Math.max(range.min,Number(variant.price))):Number(variant.price));
  const maximum=range?.max??Number(variant.price);
  return Number.isFinite(offer.price)&&offer.price>=minimum&&offer.price<=maximum?offer.price:undefined;
}
export function normalizePostcode(value:string){return value.toUpperCase().replace(/\s+/g,'').trim();}
export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  ...['DT','EX','FK','KA','KY','PL','TA','TQ','TR'].map(postcode => ({postcode,charge:50})),
  ...['DD','PA'].map(postcode => ({postcode,charge:80})),
  ...['AB','PH','PA1'].map(postcode => ({postcode,charge:150})),
  ...['IV','OR','BT'].map(postcode => ({postcode,charge:200})),
];
export function deliveryCharge(data:AlashiRecord[],postcode:string):number|undefined {
  const code=normalizePostcode(postcode);
  if(!/^(?:GIR0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]?\d[ABD-HJLNP-UW-Z]{2})$/.test(code))return;
  const outward=code.slice(0,-3);
  const configured=new Map<string,number>();
  for(const zone of DEFAULT_DELIVERY_ZONES){const key=normalizePostcode(zone.postcode);configured.set(key,Math.max(configured.get(key)||0,zone.charge));}
  for(const record of data.filter(r=>r.kind==='delivery')){const zone=record.value as DeliveryZone;configured.set(normalizePostcode(zone.postcode),zone.charge);}
  const matching=[...configured].filter(([zone])=>zone&&(code===zone||outward===zone||outward.startsWith(zone))).sort((a,b)=>b[0].length-a[0].length);
  return matching[0]?.[1] ?? 0;
}
export { ASSEMBLY_FEE } from './delivery-preferences';
