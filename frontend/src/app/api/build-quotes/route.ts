import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { builderJson, getBuild, limitBuilder, readBuilderRecord, saveBuild, insertBuilderRecord } from '@/lib/sofa-builder/server';
import type { BuildQuote } from '@/lib/sofa-builder/types';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){try{
 limitBuilder('quote:'+(request.headers.get('x-forwarded-for')||'local'),8);
 const body=await builderJson(request);
 if(typeof body.key!=='string'||!/^[-a-f0-9]{36}$/.test(body.key)||typeof body.name!=='string'||body.name.trim().length<2||body.name.length>120||typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)||typeof body.phone!=='string'||!/^\+?[\d ()-]{10,25}$/.test(body.phone)||typeof body.postcode!=='string')throw new Error('Enter your name, email, phone and delivery postcode.');
 const id=createHash('sha256').update(body.key).digest('hex').slice(0,24);
 const existing=await readBuilderRecord<BuildQuote>('quote:'+id);
 if(existing){if(existing.build.id!==body.buildId||existing.email!==body.email.trim())throw new Error('This request has already been used. Please refresh.');return NextResponse.json({reference:id,status:existing.status});}
 const original=await getBuild(body.buildId);if(!original)throw new Error('Save your build before requesting a quotation.');
 const build=await saveBuild(original.selection,body.postcode);
 const quote:BuildQuote={id,created:new Date().toISOString(),build:{...build,id:original.id},name:body.name.trim(),email:body.email.trim(),phone:body.phone.trim(),postcode:body.postcode.trim(),status:'pending',revision:1};
 const stored=await insertBuilderRecord('quote:'+id,quote);
 if(stored.build.id!==body.buildId||stored.email!==body.email.trim())throw new Error('This request has already been used. Please refresh.');
 return NextResponse.json({reference:id,status:stored.status},{status:201});
}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not save quotation request'},{status:400});}}
