import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSession, setSessionCookie, verifyPin } from '@/lib/auth/session';
import { findDemoUser } from '@/lib/auth/demo-store';
export async function POST(request: Request) {
 try {
  const body = await request.json() as { email?: string; password?: string; displayName?: string; pin?: string; rememberMe?: boolean };
  const email = body.email?.trim().toLowerCase(); const password = body.password;
  if ((!email || !password) && (!body.displayName || !/^\d{4}$/.test(body.pin ?? ''))) return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
    let user: { id: string; display_name: string; pin_hash?: string; password_hash?: string } | null = null; let demoLogin = false;
    if (process.env.DEMO_MODE === 'true' && !process.env.SUPABASE_SERVICE_ROLE_KEY && email) {
     const demoUser=findDemoUser(email); if(demoUser){ user=demoUser; }
    } else if (process.env.DEMO_MODE === 'true' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const names = new Set(['Bridger', 'Luke', 'Jackson', 'Travis']);
    const demoName = body.displayName ?? body.email; if (demoName && names.has(demoName) && (body.pin === '1234' || body.password === '1234')) { demoLogin = true; user = { id: `demo-${demoName.toLowerCase()}`, display_name: demoName, pin_hash: '' }; }
    } else {
    const supabase = createAdminClient(); const result = email ? await supabase.from('users').select('id,display_name,pin_hash,password_hash').eq('email', email).eq('active', true).maybeSingle() : await supabase.from('users').select('id,display_name,pin_hash,password_hash').eq('display_name', body.displayName).eq('active', true).maybeSingle(); user = result.data as typeof user;
    }
      const valid = user && (demoLogin || (email ? !!user.password_hash && verifyPin(password!, user.password_hash) : !!user.pin_hash && verifyPin(body.pin!, user.pin_hash)));
      if (!user || !valid) return NextResponse.json({ error: 'Those account credentials do not match.' }, { status: 401 });
    await setSessionCookie(createSession(user.id, user.display_name, body.rememberMe !== false), body.rememberMe !== false); return NextResponse.json({ ok: true });
 } catch { return NextResponse.json({ error: 'Login is not configured yet.' }, { status: 503 }); }
}
