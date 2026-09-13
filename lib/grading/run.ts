import { createAdminClient } from '@/lib/supabase/admin';
import { gradePick } from '@/lib/grading/ats';
import { rankWeeklyEntries } from '@/lib/standings/prizes';

export async function gradeFinalGames(weekId?: string) {
  const supabase = createAdminClient();
  let query = supabase.from('games').select('id,away_team,home_team,away_score,home_score,game_status,week_id,contest_games(id,spread_team,spread_value,picks(id,selected_team,confidence_points))').eq('game_status', 'final');
  if (weekId) query = query.eq('week_id', weekId);
  const { data, error } = await query;
  if (error) throw error;
  let graded = 0;
  for (const game of data ?? []) {
    if (game.away_score === null || game.home_score === null) continue;
    for (const contestGame of (game.contest_games ?? []) as Array<{ id: string; spread_team: string; spread_value: number; picks: Array<{ id: string; selected_team: string; confidence_points?: number }> }>) {
      for (const pick of contestGame.picks ?? []) {
        const result = gradePick(pick.selected_team, contestGame.spread_team, Number(contestGame.spread_value), game.away_team, game.home_team, game.away_score, game.home_score);
        const update = await supabase.from('picks').update({ result, points: result === 'win' ? Number(pick.confidence_points ?? 0) : 0 }).eq('id', pick.id);
        if (update.error) throw update.error;
        graded++;
      }
    }
  }
  let weeksQuery = supabase.from('weeks').select('id,tie_breaker_game_id');
  if (weekId) weeksQuery = weeksQuery.eq('id', weekId);
  const weeks = await weeksQuery;
  if (weeks.error) throw weeks.error;
  for (const week of weeks.data ?? []) {
    if (!week.tie_breaker_game_id) continue;
    const tieGame = await supabase.from('games').select('away_score,home_score,game_status').eq('id', week.tie_breaker_game_id).single();
    if (tieGame.error || tieGame.data.game_status !== 'final' || tieGame.data.away_score === null || tieGame.data.home_score === null) continue;
    const submissions = await supabase.from('week_submissions').select('id,tie_breaker_total').eq('week_id', week.id);
    if (submissions.error) throw submissions.error;
    const actualTotal = tieGame.data.away_score + tieGame.data.home_score;
    for (const submission of submissions.data ?? []) await supabase.from('week_submissions').update({ tie_difference: Math.abs(submission.tie_breaker_total - actualTotal) }).eq('id', submission.id);
  }
  for (const week of weeks.data ?? []) {
    const weekly = await supabase.from('picks').select('user_id,points,users(display_name),contest_games!inner(week_id)').eq('contest_games.week_id', week.id);
    if (weekly.error) throw weekly.error;
    const ties = await supabase.from('week_submissions').select('user_id,tie_difference').eq('week_id', week.id);
    if (ties.error) throw ties.error;
    const tieMap = new Map((ties.data ?? []).map((row) => [row.user_id, row.tie_difference ?? Number.MAX_SAFE_INTEGER]));
    const totals = new Map<string, { points: number; name: string }>();
    for (const row of weekly.data ?? []) { const user = row.users as unknown as { display_name: string }; const current = totals.get(row.user_id) ?? { points: 0, name: user.display_name }; current.points += Number(row.points ?? 0); totals.set(row.user_id, current); }
    const ranked = rankWeeklyEntries([...totals.entries()].map(([userId, value]) => ({ userId, points: value.points, tieDifference: tieMap.get(userId) ?? Number.MAX_SAFE_INTEGER, displayName: value.name })));
    await supabase.from('weekly_awards').delete().eq('week_id', week.id);
    for (const entry of ranked) await supabase.from('weekly_awards').insert({ week_id: week.id, user_id: entry.userId, place: entry.place, amount: entry.amount });
  }
  return graded;
}
