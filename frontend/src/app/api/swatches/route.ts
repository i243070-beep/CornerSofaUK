import { NextResponse } from 'next/server';
import { getFabricSwatches } from '@/lib/fabric-store';
import { requireAdmin } from '@/lib/require-admin';
import { builderJson, readBuilderRecord, writeBuilderRecord } from '@/lib/sofa-builder/server';
import type { FabricSwatch } from '@/lib/fabric-options';
export const dynamic='force-dynamic';
export async function GET(){try{return NextResponse.json(await getFabricSwatches(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Could not load fabrics. Please try again.'},{status:503});}}
export async function POST(request:Request){const denied=await requireAdmin();if(denied)return denied;try{
 const b=await builderJson(request);
 if(typeof b.name!=='string'||!b.name.trim()||b.name.length>120||typeof b.material!=='string'||!b.material.trim()||b.material.length>80||!/^#[0-9a-f]{6}$/i.test(b.hex_color)||!Number.isSafeInteger(b.surchargePence)||b.surchargePence<0||b.surchargePence>10000000)throw new Error('Enter a name, material, colour and valid surcharge.');
 if(b.image_url && (typeof b.image_url!=='string'||!b.image_url.startsWith('/')||b.image_url.startsWith('//')))throw new Error('Use an uploaded local image path.');
 const id=b.id||crypto.randomUUID();if(typeof id!=='string'||id.length>100)throw new Error('Invalid fabric ID.');
 const swatch:FabricSwatch={id,name:b.name.trim(),material:b.material.trim(),hex_color:b.hex_color,image_url:b.image_url||null,surchargePence:b.surchargePence};
 const current=await readBuilderRecord<FabricSwatch[]>('fabrics')||[];await writeBuilderRecord('fabrics',[...current.filter(s=>s.id!==id),swatch]);
 return NextResponse.json({swatch},{status:201});
}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not save fabric'},{status:400});}}
