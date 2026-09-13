import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { sortStandings, summarizeResults, type RecordLine } from '@/lib/standings';
import type { Pick, Player } from '@/types';

type Row = { player: Player; picks: Pick[]; base?: RecordLine; tieDiff?: number };
export async function GET(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const params = new URL(request.url).searchParams; const weekId = params.get('weekId'); const season = params.get('season'); const supabase = createAdminClient();
  if (weekId) { const week = await supabase.from('weeks').select('status').eq('id', weekId).single(); if (week.error) return NextResponse.json({ error: 'Week could not be loaded.' }, { status: 500 }); if (week.data.status !== 'completed') return NextResponse.json({ standings: [], available: false }); }
  let query = supabase.from('picks').select('id,user_id,contest_game_id,selected_team,selected_spread,confidence_points,points,result,users!inner(id,display_name),contest_games!inner(week_id,weeks!inner(season))');
  if (weekId) query = query.eq('contest_games.week_id', weekId); if (season) query = query.eq('contest_games.weeks.season', Number(season));
  const result = await query; if (result.error) return NextResponse.json({ error: 'Standings could not be loaded.' }, { status: 500 });
  const rows = new Map<string, Row>();
  if (season) {
    const history = await supabase.from('season_history').select('display_name,user_id,wins,losses,pushes,points,tie_diff,first_place_count,second_place_count,third_place_count,money_earned').eq('season', Number(season));
    if (history.error) return NextResponse.json({ error: 'Historical standings could not be loaded.' }, { status: 500 });
    const awards = await supabase.from('weekly_awards').select('user_id,amount,weeks!inner(season)').eq('weeks.season', Number(season)); const futureMoney = new Map<string, number>(); for (const award of awards.data ?? []) futureMoney.set(award.user_id, (futureMoney.get(award.user_id) ?? 0) + Number(award.amount));
    for (const item of history.data ?? []) { const id = item.user_id ?? `history:${item.display_name}`; const wins = Number(item.wins), losses = Number(item.losses), pushes = Number(item.pushes); rows.set(id, { player: { id, displayName: item.display_name }, picks: [], base: { player: { id, displayName: item.display_name }, wins, losses, pushes, winPercentage: wins + losses ? wins / (wins + losses) : 0, points: Number(item.points), moneyEarned: Number(item.money_earned) + (futureMoney.get(item.user_id) ?? 0), tieDiff: item.tie_diff ?? undefined, weeklyWins: 0, firstPlace: Number(item.first_place_count), secondPlace: Number(item.second_place_count), thirdPlace: Number(item.third_place_count) } }); }
  }
  if (weekId) { const submissions = await supabase.from('week_submissions').select('user_id,tie_difference').eq('week_id', weekId); if (!submissions.error) for (const submission of submissions.data ?? []) { const row = rows.get(submission.user_id); if (row) row.tieDiff = submission.tie_difference ?? undefined; else rows.set(submission.user_id, { player: { id: submission.user_id, displayName: submission.user_id }, picks: [], tieDiff: submission.tie_difference ?? undefined }); } }
  for (const row of result.data ?? []) { const user = row.users as unknown as { id: string; display_name: string }; const existing = rows.get(row.user_id) ?? { player: { id: user.id, displayName: user.display_name }, picks: [] }; existing.picks.push({ id: row.id, userId: row.user_id, contestGameId: row.contest_game_id, selectedTeam: row.selected_team, selectedSpread: Number(row.selected_spread), confidencePoints: Number(row.confidence_points), points: Number(row.points), result: row.result }); rows.set(row.user_id, existing); }
  const standings: RecordLine[] = [...rows.values()].map(({ player, picks, base, tieDiff }) => { const current = summarizeResults(player, picks); if (!base) return { ...current, tieDiff }; const wins = base.wins + current.wins, losses = base.losses + current.losses, pushes = base.pushes + current.pushes; return { ...base, wins, losses, pushes, points: (base.points ?? 0) + (current.points ?? 0), tieDiff: tieDiff ?? base.tieDiff, winPercentage: wins + losses ? wins / (wins + losses) : 0 }; });
  const sorted = season ? [...standings].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || b.wins - a.wins || (a.tieDiff ?? 0) - (b.tieDiff ?? 0) || a.player.displayName.localeCompare(b.player.displayName)) : sortStandings(standings);
  return NextResponse.json({ standings: sorted });
}
