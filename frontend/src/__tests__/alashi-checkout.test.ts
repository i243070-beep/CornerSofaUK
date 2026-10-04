// @vitest-environment node
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {POST} from '@/app/api/alashi/checkout/route';
import {createLocalOrder} from '@/lib/local-orders';
import {quoteProduct} from '@/lib/alashi-commerce';
import type {StoreProduct} from '@/lib/product-options';
const product:StoreProduct={id:'sofa',slug:'sofa',title:'Test sofa',category:'Corner',description:'Fabric',images:['/a.webp'],base_price:1000,variants:[{id:'colour',color:'Grey',range_type:'Corner',price:1000,stock:5}]};
vi.mock('@/lib/alashi-store',async importOriginal=>({...await importOriginal<typeof import('@/lib/alashi-store')>(),records:async()=>[{kind:'delivery',id:'delivery:M1',value:{postcode:'M1',charge:30}}]}));
vi.mock('@/lib/product-store',()=>({findProduct:async()=>product}));
vi.mock('@/lib/local-orders',()=>({createLocalOrder:vi.fn(async input=>({...input,id:'test-order',date:new Date().toISOString()}))}));
beforeEach(()=>vi.mocked(createLocalOrder).mockClear());
const customer={name:'Test Customer',email:'customer@example.com',phone:'+447456439050',address:'Test address',city:'Manchester',postcode:'M1 1AA'};
let sequence=0;
function request(changes:object={}){return new Request('http://localhost/api/alashi/checkout/',{method:'POST',headers:{'x-forwarded-for':`checkout-${sequence++}`},body:JSON.stringify({items:[{productId:'sofa',variantId:'colour',quantity:2,price:1000}],customer,deliveryCost:-1000,assembly:0,...changes})});}
describe('ALASHI COD checkout',()=>{
it('computes quantity, postcode fee and fixed assembly on the server',async()=>{const r=await POST(request());expect(r.status).toBe(201);const d=await r.json();expect(d.invoice.subtotal).toBe(2000);expect(d.invoice.delivery).toBe(30);expect(d.invoice.assembly).toBe(20);expect(d.invoice.total).toBe(2050);expect(createLocalOrder).toHaveBeenCalledWith(expect.objectContaining({paymentMethod:'Cash on Delivery',status:'pending',total:2050}));});
it('rejects price tampering and never creates the order',async()=>{expect((await POST(request({items:[{productId:'sofa',variantId:'colour',quantity:1,price:1}]}))).status).toBe(400);expect(createLocalOrder).not.toHaveBeenCalled();});
it('accepts a genuine signed current offer',async()=>{const quote=quoteProduct(product,[]);expect((await POST(request({items:[{productId:'sofa',variantId:'colour',quantity:1,price:quote.price,offerToken:quote.offerToken}]}))).status).toBe(201);});
it('applies free delivery to valid postcodes outside the supplied charge zones',async()=>{const response=await POST(request({customer:{...customer,postcode:'SW1A 1AA'}}));expect(response.status).toBe(201);expect((await response.json()).invoice.delivery).toBe(0);expect(createLocalOrder).toHaveBeenCalledWith(expect.objectContaining({deliveryCost:0,total:2020}));});
});
