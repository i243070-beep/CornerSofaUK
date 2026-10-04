// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {quoteProduct,validOffer,signAlashi,readAlashi,deliveryCharge} from '@/lib/alashi-commerce';
import {matchProducts} from '@/lib/alashi-matching';
import {courtesy} from '@/lib/alashi-rules';
import type {StoreProduct} from '@/lib/product-options';
import type {AlashiRecord} from '@/lib/alashi-store';
const product:StoreProduct={id:'a',slug:'sofa',title:'Leather recliner',description:'Electric recliner',category:'Recliner',base_price:1000,images:['/a.webp'],variants:[{id:'v',range_type:'Recliner',color:'Grey',stock:3,price:1000}]};
const data:AlashiRecord[]=[{kind:'range',id:'category:Recliner',value:{min:900,max:1200,floor:800}}];
describe('private negotiation and real catalogue matching',()=>{
it('starts at normal price then gradually reaches but never crosses the private minimum',()=>{let previous=quoteProduct(product,data);expect(previous.price).toBe(1000);for(let i=0;i<20;i++){const next=quoteProduct(product,data,previous.price,true);expect(next.price).toBeGreaterThanOrEqual(800);expect(next.price).toBeLessThanOrEqual(previous.price);previous=next;}expect(previous.price).toBe(800);expect(previous.range).toEqual({min:900,max:1200});expect(JSON.stringify(previous)).not.toContain('floor');});
it('keeps the real listed price when no owner range exists',()=>{expect(quoteProduct(product,[],undefined,true).price).toBe(1000);});
it('accepts only signed current offers for the same product and colour',()=>{const quote=quoteProduct(product,data,950,true);expect(validOffer(quote.offerToken,product,'v',data)).toBe(875);expect(validOffer(quote.offerToken+'bad',product,'v',data)).toBeUndefined();expect(validOffer(quote.offerToken,product,'other',data)).toBeUndefined();expect(validOffer(quote.offerToken,{...product,variants:[{...product.variants[0],price:1100}]},'v',data)).toBeUndefined();});
it('does not trust unsigned or modified conversation state',()=>{const signed=signAlashi({type:'conversation',selected:['a']});expect(readAlashi(signed)).toMatchObject({selected:['a']});expect(readAlashi(signed.replace(/^./,'!'))).toBeUndefined();});
it('uses the supplied postcode surcharges, most specific matching zone and free delivery elsewhere',()=>{const zones:AlashiRecord[]=[{kind:'delivery',id:'delivery:M1',value:{postcode:'M1',charge:0}},{kind:'delivery',id:'delivery:M11AA',value:{postcode:'M1 1AA',charge:25}}];expect(deliveryCharge(zones,'m1 1aa')).toBe(25);expect(deliveryCharge(zones,'M1 2AB')).toBe(0);expect(deliveryCharge(zones,'M11 2AB')).toBe(0);expect(deliveryCharge([],'DT1 1AA')).toBe(50);expect(deliveryCharge([],'DD1 1AA')).toBe(80);expect(deliveryCharge([],'AB1 1AA')).toBe(150);expect(deliveryCharge([],'PA1 1AA')).toBe(150);expect(deliveryCharge([],'IV1 1AA')).toBe(200);expect(deliveryCharge([],'SW1A 1AA')).toBe(0);expect(deliveryCharge([],'NOT A POSTCODE')).toBeUndefined();});
it('understands recliner typos and chooses an unseen real alternative',()=>{const other={...product,id:'b',title:'Another recliner'};expect(matchProducts([product,other],'i want electric reclinear')[0].id).toBe('a');expect(matchProducts([product,other],'recliner',['a'],true)[0].id).toBe('b');});
it('responds politely and honestly about AI identity',()=>{expect(courtesy('Salam')).toContain('Welcome');expect(courtesy('are you a bot?')).toContain('AI assistant');});
});
