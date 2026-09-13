import type { ContestGame, Week } from '@/types';

/** All comparisons use server-supplied Date values; the browser clock is advisory only. */
export function canEditWeeklyPicks(week: Week, now: Date = new Date()): boolean {
  return now.getTime() < new Date(week.pickLockAt).getTime() && week.status === 'open';
}

export function areWeeklyPicksPublic(week: Week, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(week.pickLockAt).getTime();
}

export function effectivePickDeadline(week: Week, game: ContestGame): Date {
  const weeklyDeadline = new Date(week.pickLockAt);
  const kickoff = new Date(game.game.kickoffAt);
  return kickoff < weeklyDeadline ? kickoff : weeklyDeadline;
}

export function canEditPick(week: Week, game: ContestGame, now: Date = new Date()): boolean {
  return canEditWeeklyPicks(week, now) && now.getTime() < effectivePickDeadline(week, game).getTime();
}

export function defaultDenverSaturdayDeadline(saturdayDate: string): string {
  const [year, month, day] = saturdayDate.split('-').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, 10, 0, 0);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(targetUtc));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const displayedAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  const offset = displayedAsUtc - targetUtc;
  return new Date(targetUtc - offset).toISOString();
}
