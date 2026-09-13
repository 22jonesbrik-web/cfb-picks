import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'cfb_picks_session';
const SESSION_TTL = 60 * 60 * 24 * 30;
const BROWSER_SESSION_TTL = 60 * 60 * 8;
type Session = { userId: string; displayName: string; exp: number };
function secret() { const value = process.env.SESSION_SECRET; if (!value) throw new Error('SESSION_SECRET is not configured.'); return value; }
function encode(value: string) { return Buffer.from(value).toString('base64url'); }
function decode(value: string) { return Buffer.from(value, 'base64url').toString('utf8'); }
export function hashPin(pin: string): string { const salt = randomBytes(16).toString('hex'); return `scrypt:${salt}:${scryptSync(pin, salt, 64).toString('hex')}`; }
export const hashPassword = hashPin;
export function verifyPin(pin: string, stored: string): boolean { const [, salt, expected] = stored.split(':'); if (!salt || !expected) return false; const actual = scryptSync(pin, salt, 64).toString('hex'); return timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }
export function createSession(userId: string, displayName: string, rememberMe = true): string { const ttl = rememberMe ? SESSION_TTL : BROWSER_SESSION_TTL; const payload = encode(JSON.stringify({ userId, displayName, exp: Math.floor(Date.now() / 1000) + ttl } satisfies Session)); return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`; }
export function readSessionValue(value?: string): Session | null { if (!value) return null; const [payload, signature] = value.split('.'); if (!payload || !signature) return null; const expected = createHmac('sha256', secret()).update(payload).digest('base64url'); if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; try { const session = JSON.parse(decode(payload)) as Session; return session.exp > Math.floor(Date.now() / 1000) ? session : null; } catch { return null; } }
export async function getSession(): Promise<Session | null> { const store = await cookies(); return readSessionValue(store.get(COOKIE_NAME)?.value); }
export async function setSessionCookie(session: string, rememberMe = true) { (await cookies()).set(COOKIE_NAME, session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', ...(rememberMe ? { maxAge: SESSION_TTL } : {}) }); }
export async function clearSessionCookie() { (await cookies()).delete(COOKIE_NAME); }
export { COOKIE_NAME };
