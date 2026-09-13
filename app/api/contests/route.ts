import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
export async function GET(){if(process.env.DEMO_MODE==='true'&&!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({contests:[{id:'demo-cfb-pickem',name:'CFB Pickem',slug:'cfb-pickem'}]});if(!await getSession())return NextResponse.json({error:'Sign in required.'},{status:401});try{const supabase=createAdminClient();const {data,error}=await supabase.from('contests').select('id,name,slug').eq('active',true).order('name');if(error)throw error;return NextResponse.json({contests:data});}catch{return NextResponse.json({error:'Contests could not be loaded.'},{status:503});}}
