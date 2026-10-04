import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin } from '@/lib/require-admin';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const directory = path.resolve(process.cwd(), '..', 'backgrounds');
  const themes = (await readdir(directory)).filter(name => /^bg-[\w-]+\.(png|webp|jpg)$/i.test(name)).sort();
  const file = request.nextUrl.searchParams.get('file');
  if (!file) return NextResponse.json({ themes });
  if (!themes.includes(file)) return NextResponse.json({ error: 'Unknown theme' }, { status: 404 });
  return new NextResponse(new Uint8Array(await readFile(path.join(directory, file))), { headers: { 'Content-Type': file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg' } });
}
