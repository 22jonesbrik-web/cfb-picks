'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function ManagerLink(){const [allowed,setAllowed]=useState(false);useEffect(()=>{fetch('/api/auth/me').then(response=>response.ok?response.json():null).then(result=>setAllowed(result?.user?.role==='owner'||result?.user?.role==='admin')).catch(()=>undefined);},[]);if(!allowed)return null;return <div className="manager-links"><Link href="/" className="manager-link">Make my picks</Link><Link href="/admin" className="manager-link">Commissioner settings</Link></div>;}
