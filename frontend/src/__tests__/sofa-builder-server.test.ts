// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { EMPTY_BUILD } from '@/lib/sofa-builder/types';
const data=vi.hoisted(()=>({price:500}));
vi.mock('@/lib/db',()=>({isDatabaseConfigured:false}));
vi.mock('@/lib/product-store',()=>({listProducts:async()=>[{id:'sofa',title:'Server sofa',category:'2-Seater Sofas',images:['/sofa.webp'],variants:[{id:'grey',color:'Grey',range_type:'2-Seater',price:data.price,stock:10}]}]}));
vi.mock('@/lib/alashi-store',()=>({records:async()=>[]}));
import { saveBuild, getBuild, configurationIdentity, validateSelection, getBuilderQuotes } from '@/lib/sofa-builder/server';
import { validateCheckoutItems } from '@/lib/checkout-products';
import { POST } from '@/app/api/build-quotes/route';
let directory='';
const selection={...EMPTY_BUILD,shape:'2-Seater Sofas',productId:'sofa',variantId:'grey'};
beforeEach(async()=>{directory=await mkdtemp(path.join(tmpdir(),'sofa-builder-test-'));vi.stubEnv('PRODUCT_DATA_DIR',directory);data.price=500;});
afterEach(async()=>{const folder=path.join(directory,'builder');for(const file of await readdir(folder).catch(()=>[]))await unlink(path.join(folder,file));await rmdir(folder).catch(()=>{});await rmdir(directory);vi.unstubAllEnvs();});
describe('Builder snapshots, checkout and quotations',()=>{
 it('accepts a fabric-attached sofa before postcode collection and rejects standalone swatches',async()=>{const build=await saveBuild({...selection,fabricId:'s1',piping:'contrast',pipingColour:'Gold'});expect(build.price.status).toBe('estimate');const result=await validateCheckoutItems([{productId:'sofa',variantId:`build:${configurationIdentity(build.selection)}`,buildId:build.id,price:500,quantity:1}]);expect(result[0].buildSnapshot?.price.fabric?.id).toBe('s1');await expect(validateCheckoutItems([{productId:'swatch-s1',variantId:'swatch-s1',itemType:'swatch',price:0,quantity:1}])).rejects.toThrow('Fabric is a sofa choice');});
 it('uses server prices and preserves the original snapshot through checkout',async()=>{const build=await saveBuild(selection,'SW1A 1AA');const items=await validateCheckoutItems([{productId:'sofa',variantId:`build:${configurationIdentity(selection)}`,buildId:build.id,price:500,quantity:1,title:'Forged'}]);expect(items[0].buildSnapshot).toEqual(build);expect(items[0].title).not.toBe('Forged');expect(await getBuild(build.id)).toEqual(build);});
 it('rejects changed catalogue prices and tampered browser prices',async()=>{const build=await saveBuild(selection,'SW1A 1AA');const item={productId:'sofa',variantId:`build:${configurationIdentity(selection)}`,buildId:build.id,price:1,quantity:1};await expect(validateCheckoutItems([item])).rejects.toThrow('changed');data.price=600;await expect(validateCheckoutItems([{...item,price:500}])).rejects.toThrow('changed');expect((await getBuild(build.id))!.price.merchandisePence).toBe(50000);});
 it('blocks unresolved custom builds from normal checkout',async()=>{const build=await saveBuild({...selection,request:true,notes:'Please quote custom brass feet'},'SW1A 1AA');await expect(validateCheckoutItems([{productId:'sofa',variantId:`build:${configurationIdentity(build.selection)}`,buildId:build.id,price:500,quantity:1}])).rejects.toThrow('quotation');});
 it('persists simultaneous duplicate quote submissions exactly once',async()=>{const build=await saveBuild({...selection,request:true,notes:'Please quote a custom fabric'},'SW1A 1AA');const payload={key:crypto.randomUUID(),buildId:build.id,name:'Example Customer',email:'builder@example.invalid',phone:'07700900123',postcode:'SW1A 1AA'};const send=()=>POST(new NextRequest('http://localhost/api/build-quotes',{method:'POST',body:JSON.stringify(payload)}));const responses=await Promise.all([send(),send()]);expect(responses.every(r=>r.status<300)).toBe(true);const results=await Promise.all(responses.map(r=>r.json()));expect(results[0].reference).toBe(results[1].reference);expect(await getBuilderQuotes()).toHaveLength(1);expect((await getBuilderQuotes())[0].build.selection.notes).toContain('custom fabric');});
 it('strips contact fields injected into anonymous selections',()=>{const clean=validateSelection({...selection,email:'private@example.invalid',services:{...selection.services,address:'private address'},extras:[]});expect(JSON.stringify(clean)).not.toContain('private');});
 it('keeps different room instructions as separate configurations',()=>{expect(configurationIdentity(selection)).not.toBe(configurationIdentity({...selection,access:{doorwayMm:850}}));expect(configurationIdentity({...selection,dimensionsMm:{width:2000,depth:900}})).toBe(configurationIdentity({...selection,dimensionsMm:{depth:900,width:2000}}));});
});
