import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({ ok: true, service: 'cfb-picks', demoMode: process.env.DEMO_MODE === 'true' }); }
