import type { ContestGame, Pick, Week } from '@/types';
import { areWeeklyPicksPublic, canEditPick } from '@/lib/picks/locking';

export function assertPickCanBeWritten(week: Week, game: ContestGame, now = new Date()): void {
  if (!canEditPick(week, game, now)) throw new Error('Picks are locked for this game.');
}

export function visiblePicksForViewer(week: Week, picks: Pick[], viewerId: string, now = new Date()): Pick[] {
  if (areWeeklyPicksPublic(week, now)) return picks;
  return picks.filter((pick) => pick.userId === viewerId);
}
