import { existsSync, readFileSync } from 'node:fs';
if (existsSync('.env.local')) for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2]; }
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET', 'OWNER_EMAIL'];
const missing = required.filter((name) => !process.env[name]);
const demoFlags = process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
if (missing.length || demoFlags) {
  if (missing.length) console.error(`Missing production variables: ${missing.join(', ')}`);
  if (demoFlags) console.error('Demo mode must be false for production.');
  process.exit(1);
}
if (!/^https:\/\/.+\.supabase\.co$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL)) { console.error('NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL.'); process.exit(1); }
if (process.env.SESSION_SECRET.length < 32) { console.error('SESSION_SECRET must be at least 32 characters.'); process.exit(1); }
console.log('Production environment configuration is present.');
