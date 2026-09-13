import './globals.css';
import type { Metadata } from 'next';
import ManagerLink from '@/components/ManagerLink';
export const metadata: Metadata = { title: 'CFB Picks', description: 'Private college football pick em' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}<ManagerLink /></body></html>; }
