import type { Pick, Player, PickResult } from '@/types';

export type RecordLine = { player: Player; wins: number; losses: number; pushes: number; winPercentage: number; weeklyWins?: number; firstPlace?: number; secondPlace?: number; thirdPlace?: number; points?: number; tieDiff?: number; moneyEarned?: number };

export function summarizeResults(player: Player, picks: Pick[], weeklyWins = 0): RecordLine {
  const counts = picks.reduce((result, pick) => { if (pick.result === 'win') result.wins++; if (pick.result === 'loss') result.losses++; if (pick.result === 'push') result.pushes++; result.points += pick.points ?? (pick.result === 'win' ? pick.confidencePoints ?? 0 : 0); return result; }, { wins: 0, losses: 0, pushes: 0, points: 0 });
  const decided = counts.wins + counts.losses;
  return { player, ...counts, winPercentage: decided ? counts.wins / decided : 0, weeklyWins };
}

export function sortStandings(rows: RecordLine[]): RecordLine[] {
  return [...rows].sort((a, b) => b.wins - a.wins || b.winPercentage - a.winPercentage || a.player.displayName.localeCompare(b.player.displayName));
}

export function resultLabel(result: PickResult): string { return result === 'pending' ? 'PENDING' : result.toUpperCase(); }
