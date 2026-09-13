import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { gradeFinalGames } from '@/lib/grading/run';
export async function POST(request: Request) { try { await requireAdmin(); const body=await request.json().catch(()=>({})) as {weekId?:string}; const graded=await gradeFinalGames(body.weekId); return NextResponse.json({ok:true,graded}); } catch(error) { const message=error instanceof Error&&error.message==='FORBIDDEN'?'Commissioner access required.':error instanceof Error&&error.message==='UNAUTHENTICATED'?'Sign in required.':'Grading failed.'; return NextResponse.json({error:message},{status:message==='Grading failed.'?500:401}); } }
