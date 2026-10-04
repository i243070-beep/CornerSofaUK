import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { builderJson, getBuilderQuotes, getBuilderRules, validateRules, writeBuilderRecord } from '@/lib/sofa-builder/server';
export const dynamic='force-dynamic';
export async function GET(){const denied=await requireAdmin();if(denied)return denied;return NextResponse.json({rules:await getBuilderRules(),quotes:await getBuilderQuotes()},{headers:{'Cache-Control':'no-store'}});}
export async function PUT(request:NextRequest){const denied=await requireAdmin();if(denied)return denied;try{const body=await builderJson(request);if(body.rules){const rules=validateRules(body.rules);rules.revision=(await getBuilderRules()).revision+1;await writeBuilderRecord('settings',rules);return NextResponse.json({rules});}
 const quote=(await getBuilderQuotes()).find(q=>q.id===body.id);if(!quote)throw new Error('Quote not found');
 if(!['reviewed','approved'].includes(body.status)||typeof body.adminNotes!=='string'||body.adminNotes.length>2000)throw new Error('Check the quote status and notes.');
 if(body.status==='approved'&&(!Number.isSafeInteger(body.approvedPence)||body.approvedPence<=0||body.approvedPence>100000000||typeof body.expires!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.expires)||body.expires<new Date().toISOString().slice(0,10)))throw new Error('Set a positive final price in pence and future expiry date.');
 const next={...quote,status:body.status,adminNotes:body.adminNotes,approvedPence:body.approvedPence,expires:body.expires,revision:quote.revision+1};await writeBuilderRecord('quote-history:'+quote.id+':'+quote.revision,quote);await writeBuilderRecord('quote:'+quote.id,next);return NextResponse.json({success:true});
}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not save settings'},{status:400});}}
