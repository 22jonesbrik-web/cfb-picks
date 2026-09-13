export const WEEKLY_PRIZES = { 1: 115, 2: 70, 3: 35 } as const;
type Entry = { userId: string; points: number; tieDifference: number; displayName: string };
export function rankWeeklyEntries(entries: Entry[]) { return [...entries].sort((a,b)=>b.points-a.points||a.tieDifference-b.tieDifference||a.displayName.localeCompare(b.displayName)).slice(0,3).map((entry,index)=>({...entry,place:(index+1) as 1|2|3,amount:WEEKLY_PRIZES[(index+1) as 1|2|3]})); }
