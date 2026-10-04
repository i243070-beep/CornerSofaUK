import { NextRequest, NextResponse } from 'next/server';
import { generateSofaPreview } from '@/lib/sofa-preview-renderer';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Please sign out of admin and sign in again to create colour previews.' }, { status: 401 });
  }
  try {
    if (Number(request.headers.get('content-length')) > 8000) return NextResponse.json({ error: 'Photo request is too large.' }, { status: 400 });
    const { source, color, theme = '' } = await request.json();
    if (typeof source !== 'string' || typeof color !== 'string') return NextResponse.json({ error: 'Choose a main sofa photo and colour.' }, { status: 400 });
    if (typeof theme !== 'string' || (theme && !/^bg-[\w-]+\.(png|webp|jpg)$/i.test(theme))) return NextResponse.json({ error: 'Choose an existing room theme.' }, { status: 400 });
    const url = await generateSofaPreview(source, color, theme);
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Sofa preview generation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The colour preview could not be created. Please try again.' }, { status: 400 });
  }
}
