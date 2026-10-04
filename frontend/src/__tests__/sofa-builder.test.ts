// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { priceBuild, reconcileBuild } from '@/lib/sofa-builder/pricing';
import { DEFAULT_RULES, EMPTY_BUILD, type BuilderRules } from '@/lib/sofa-builder/types';
import type { StoreProduct } from '@/lib/product-options';

const sofa: StoreProduct={id:'sofa',slug:'sofa',title:'Example sofa',description:'',base_price:500,images:['/sofa.webp'],category:'2-Seater Sofas',variants:[{id:'grey',range_type:'2-Seater',color:'Grey',price:500,stock:10},{id:'blue',range_type:'2-Seater',color:'Blue',price:550,stock:10}]};
const chair: StoreProduct={...sofa,id:'chair',title:'Example chair',variants:[{...sofa.variants[0],id:'chair-grey',price:200}]};
const selection={...EMPTY_BUILD,shape:sofa.category,productId:sofa.id,variantId:'grey'};
const rules:BuilderRules={...DEFAULT_RULES,products:{sofa:{matchingProductIds:['chair']}},options:[{id:'oak',label:'Approved oak feet',group:'feet',productIds:['sofa'],variantIds:['grey'],priceMode:'fixed',amountPence:2500,published:true}]};
describe('Sofa builder pricing and compatibility',()=>{
 it('includes fabric and contrast piping without requiring a quotation',()=>{const p=priceBuild({...selection,fabricId:'s1',customColour:'Sage green',piping:'contrast',pipingColour:'Gold'},[sofa],rules,0);expect(p.status).toBe('fixed');expect(p.totalPence).toBe(50000);expect(p.fabric?.id).toBe('s1');expect(p.specification.join(' ')).toContain('Sage green');expect(p.specification.join(' ')).toContain('Gold');});
 it('uses a newly published fabric and its configured surcharge',()=>{const p=priceBuild({...selection,fabricId:'new-fabric'},[sofa],rules,0,[{id:'new-fabric',name:'Ocean',material:'Woven',hex_color:'#123456',image_url:'/images/fabric.webp',surchargePence:2500}]);expect(p.status).toBe('fixed');expect(p.merchandisePence).toBe(52500);expect(p.fabric?.image_url).toBe('/images/fabric.webp');});
 it('rejects a fabric ID absent from the current catalogue',()=>{expect(priceBuild({...selection,fabricId:'missing'},[sofa],rules,0).status).toBe('unavailable');});
 it('allows matching piping without demanding a contrast colour',()=>{expect(priceBuild({...selection,piping:'matching'},[sofa],rules,0).status).toBe('fixed');});
 it('prices catalogue merchandise separately from delivery and services',()=>{const p=priceBuild({...selection,services:{floor:'first',removal:true}},[sofa],rules,50);expect(p.status).toBe('fixed');expect(p.merchandisePence).toBe(50000);expect(p.totalPence).toBe(59000);});
 it('does not present an unchecked delivery subtotal as a final price',()=>{expect(priceBuild(selection,[sofa],rules)).toMatchObject({status:'estimate',totalPence:null});});
 it('adds only approved option and matching piece prices',()=>{const p=priceBuild({...selection,feet:'oak',extras:[{productId:'chair',variantId:'chair-grey',quantity:2}]},[sofa,chair],rules,0);expect(p.totalPence).toBe(92500);expect(p.specification.join(' ')).toContain('Example chair');});
 it('routes custom measurements and special requests to quotation',()=>{const p=priceBuild({...selection,customSize:true,dimensionsMm:{width:2400},feet:'request',notes:'Please fit taller brass feet.'},[sofa],rules,0);expect(p.status).toBe('quote_required');expect(p.totalPence).toBeNull();expect(p.errors).toEqual([]);});
 it('rejects invented options and unapproved extras',()=>{expect(priceBuild({...selection,feet:'invented'},[sofa],rules,0).status).toBe('unavailable');expect(priceBuild({...selection,extras:[{productId:'missing',variantId:'x',quantity:1}]},[sofa],rules,0).status).toBe('unavailable');});
 it('rejects invalid custom dimensions and missing request details',()=>{expect(priceBuild({...selection,customSize:true,dimensionsMm:{width:-1},request:true},[sofa],rules,0).errors.length).toBe(2);});
 it('preserves piping colour and room/access instructions in the snapshot specification',()=>{const p=priceBuild({...selection,piping:'request',pipingColour:'Forest green',notes:'Please use contrast green piping',roomPlan:{widthMm:4000,lengthMm:5000,xMm:200,yMm:0,rotation:90,obstacles:[]},access:{doorwayMm:850}},[sofa],rules,0);expect(p.specification.join(' ')).toContain('Forest green');expect(p.specification.join(' ')).toContain('4000 by 5000');expect(p.specification.join(' ')).toContain('850');});
 it('resets incompatible finishes when changing colour',()=>{const result=reconcileBuild({...selection,variantId:'blue',feet:'oak'},sofa,rules);expect(result.selection.feet).toBe('standard');expect(result.changes).toHaveLength(1);});
 it('restores only currently allowed variants',()=>{const result=reconcileBuild(selection,sofa,{...rules,products:{sofa:{variantIds:['blue']}}});expect(result.selection.variantId).toBe('blue');});
 it('rejects disabled designs and invalid quantities',()=>{expect(priceBuild(selection,[sofa],{...rules,disabledProductIds:['sofa']},0).status).toBe('unavailable');expect(priceBuild({...selection,extras:[{productId:'chair',variantId:'chair-grey',quantity:11}]},[sofa,chair],rules,0).status).toBe('unavailable');});
});
