import type { PickResult } from '@/types';

export function gradePick(selectedTeam: string, spreadTeam: string, spreadValue: number, awayTeam: string, homeTeam: string, awayScore: number, homeScore: number): PickResult {
  const selectedScore = selectedTeam === awayTeam ? awayScore : homeScore;
  const opponentScore = selectedTeam === awayTeam ? homeScore : awayScore;
  const selectedMargin = selectedScore - opponentScore;
  const appliedSpread = selectedTeam === spreadTeam ? spreadValue : -spreadValue;
  const adjustedMargin = selectedMargin + appliedSpread;
  return adjustedMargin > 0 ? 'win' : adjustedMargin < 0 ? 'loss' : 'push';
}
