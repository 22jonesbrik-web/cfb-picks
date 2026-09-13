import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'cfb_picks_session';
function decodeBase64Url(value: string) { const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='); return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)); }
async function hasValidSignature(value?: string) { if (!value || !process.env.SESSION_SECRET) return false; const [payload, signature] = value.split('.'); if (!payload || !signature) return false; const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']); return crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), new TextEncoder().encode(payload)); }

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/auth') || request.nextUrl.pathname === '/api/health' || request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register' || request.nextUrl.pathname.startsWith('/_next')) return NextResponse.next();
  if (!await hasValidSignature(request.cookies.get(COOKIE_NAME)?.value)) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!favicon.ico).*)'] };