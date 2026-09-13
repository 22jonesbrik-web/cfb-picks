import { hashPassword } from '@/lib/auth/session';

type DemoUser = { id: string; email: string; display_name: string; password_hash: string; role: 'owner'|'admin'|'player' };
const users = new Map<string, DemoUser>();
export function createDemoUser(email: string, displayName: string, password: string): DemoUser { const user={id:`demo-${crypto.randomUUID()}`,email,display_name:displayName,password_hash:hashPassword(password),role:email===process.env.OWNER_EMAIL?.trim().toLowerCase()?'owner':'player'} as DemoUser; users.set(email,user); return user; }
export function findDemoUser(email: string): DemoUser | null { return users.get(email) ?? null; }
export function findDemoUserById(id: string): DemoUser | null { return [...users.values()].find(user=>user.id===id) ?? null; }
export function updateDemoPassword(id: string, password: string) { const user=findDemoUserById(id); if(user) user.password_hash=hashPassword(password); }
