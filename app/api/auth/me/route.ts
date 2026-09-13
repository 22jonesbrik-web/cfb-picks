import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { findDemoUserById } from '@/lib/auth/demo-store';
export async function GET(){const session=await getSession();if(!session)return NextResponse.json({error:'Sign in required.'},{status:401});if(process.env.DEMO_MODE==='true'&&!process.env.SUPABASE_SERVICE_ROLE_KEY){const user=findDemoUserById(session.userId);return NextResponse.json({user:{id:session.userId,displayName:user?.display_name??session.displayName,email:user?.email??null,role:user?.role??'player'}});}try{const supabase=createAdminClient();const {data,error}=await supabase.from('users').select('id,email,display_name,role').eq('id',session.userId).single();if(error)throw error;return NextResponse.json({user:{id:data.id,displayName:data.display_name,email:data.email,role:data.role}});}catch{return NextResponse.json({error:'Account could not be loaded.'},{status:500});}}
