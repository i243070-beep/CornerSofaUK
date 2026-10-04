import { getFabricSwatches } from '@/lib/fabric-store';
import type { Metadata } from 'next';
import { listProducts } from '@/lib/product-store';
import { getBuilderRules } from '@/lib/sofa-builder/server';
import SofaBuilder from './SofaBuilder';
export const dynamic='force-dynamic';
const metadata:Metadata={title:'Build your own sofa',description:'Create your sofa with our own designs and fabrics. Explore the details, plan your space and save your personal specification.',alternates:{canonical:'/build'}};
export async function generateMetadata({searchParams}:{searchParams:Promise<{build?:string;edit?:string}>}):Promise<Metadata>{const params=await searchParams;return {...metadata,...(params.build||params.edit?{robots:{index:false,follow:false}}:{})};}
export default async function BuildPage({searchParams}:{searchParams:Promise<{product?:string;variant?:string;build?:string;edit?:string}>}){const [params, fabrics, products, rules]=await Promise.all([searchParams,getFabricSwatches(),listProducts(),getBuilderRules()]);return <SofaBuilder initialFabrics={fabrics} products={products} rules={rules} initialProduct={params.product||''} initialVariant={params.variant||''} savedId={params.build||''} editId={params.edit||''}/>;}
