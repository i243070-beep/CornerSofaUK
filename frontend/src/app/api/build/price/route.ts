import { NextRequest, NextResponse } from 'next/server';
import { builderJson, limitBuilder, serverPrice } from '@/lib/sofa-builder/server';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) { try { limitBuilder('price:'+(request.headers.get('x-forwarded-for')||'local')); const body=await builderJson(request); return NextResponse.json(await serverPrice(body.selection,body.postcode),{headers:{'Cache-Control':'no-store'}}); } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'Could not price build'},{status:400}); } }
