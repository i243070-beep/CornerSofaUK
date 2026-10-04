import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE, createAdminSession, verifyAdminSession } from '@/lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503 });
    const { username, password } = await request.json();

    if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const session = createAdminSession();

    const response = NextResponse.json({
      success: true,
      expiresAt: session.expiresAt,
    });
    response.cookies.set(ADMIN_SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
      expires: new Date(session.expiresAt),
    });
    response.headers.append('Set-Cookie', ADMIN_SESSION_COOKIE + '=; Path=/api/sofa-previews; Max-Age=0; HttpOnly; SameSite=Strict');
    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  response.headers.append('Set-Cookie', ADMIN_SESSION_COOKIE + '=; Path=/api/sofa-previews; Max-Age=0; HttpOnly; SameSite=Strict');
  return response;
}

export async function GET(request: NextRequest) {
  const valid = verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  return NextResponse.json({ valid }, { status: valid ? 200 : 401, headers: { 'Cache-Control': 'no-store' } });
}
