import { NextResponse } from 'next/server';
import { assertPickCanBeWritten } from '@/lib/server/pick-policy';
import { getSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ContestGame, Game, Week } from '@/types';

function toWeek(value: Record<string, unknown>): Week { return { id: String(value.id), season: Number(value.season), weekNumber: Number(value.week_number), name: String(value.name), status: value.status as Week['status'], pickLockAt: String(value.pick_lock_at) }; }
function toContestGame(value: Record<string, unknown>): ContestGame { const game = value.games as Record<string, unknown>; return { id: String(value.id), weekId: String(value.week_id), spreadTeam: String(value.spread_team), spreadValue: Number(value.spread_value), displayOrder: Number(value.display_order), game: { id: String(game.id), weekId: String(game.week_id), awayTeam: String(game.away_team), awayAbbr: String(game.away_team_abbreviation), homeTeam: String(game.home_team), homeAbbr: String(game.home_team_abbreviation), kickoffAt: String(game.kickoff_at), status: game.game_status as Game['status'], awayScore: game.away_score as number | undefined, homeScore: game.home_score as number | undefined } }; }

export async function POST(request: Request) {
 const session = await getSession(); if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
 const body = await request.json() as { contestGameId?: string; selectedTeam?: string; confidencePoints?: number };
 if (!body.contestGameId || !body.selectedTeam) return NextResponse.json({ error: 'Invalid pick.' }, { status: 400 });
 const supabase = createAdminClient();
 const { data, error } = await supabase.from('contest_games').select('id,week_id,spread_team,spread_value,display_order,games(*),weeks(*)').eq('id', body.contestGameId).eq('active', true).maybeSingle();
 if (error || !data) return NextResponse.json({ error: 'Contest game not found.' }, { status: 404 });
 const row = data as unknown as Record<string, unknown>; const weekValue = row.weeks as Record<string, unknown>; const game = toContestGame(row); const week = toWeek(weekValue);
 if (body.selectedTeam !== game.game.awayTeam && body.selectedTeam !== game.game.homeTeam) return NextResponse.json({ error: 'That team is not in this game.' }, { status: 400 });
 if (!Number.isInteger(body.confidencePoints) || body.confidencePoints! < 1 || body.confidencePoints! > 10) return NextResponse.json({ error: 'Choose confidence points from 1 through 10.' }, { status: 400 });
 try { assertPickCanBeWritten(week, game); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Picks are locked.' }, { status: 409 }); }
 const selectedSpread = body.selectedTeam === game.spreadTeam ? game.spreadValue : -game.spreadValue;
 const weekPicks = await supabase.from('picks').select('id,confidence_points,contest_games!inner(week_id)').eq('user_id', session.userId).eq('contest_games.week_id', week.id).neq('contest_game_id', game.id);
 if (weekPicks.error) return NextResponse.json({ error: 'Existing picks could not be checked.' }, { status: 500 });
 if ((weekPicks.data?.length ?? 0) >= 10) return NextResponse.json({ error: 'You can select exactly 10 games per week.' }, { status: 409 });
 if (weekPicks.data?.some((pick) => pick.confidence_points === body.confidencePoints)) return NextResponse.json({ error: 'Each confidence value from 1 to 10 can only be used once.' }, { status: 409 });
 const result = await supabase.from('picks').upsert({ user_id: session.userId, contest_game_id: game.id, selected_team: body.selectedTeam, selected_spread: selectedSpread, confidence_points: body.confidencePoints, points: 0, result: 'pending' }, { onConflict: 'user_id,contest_game_id' }).select('id,user_id,contest_game_id,selected_team,selected_spread,confidence_points,points,result').single();
 if (result.error) return NextResponse.json({ error: 'Pick could not be saved.' }, { status: 500 });
 return NextResponse.json({ pick: result.data });
}

export async function GET(request: Request) {
 const session = await getSession(); if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
 const weekId = new URL(request.url).searchParams.get('weekId'); if (!weekId) return NextResponse.json({ error: 'weekId is required.' }, { status: 400 });
 const supabase = createAdminClient(); const weekResult = await supabase.from('weeks').select('pick_lock_at').eq('id', weekId).single(); if (weekResult.error) return NextResponse.json({ error: 'Week not found.' }, { status: 404 });
 const publicNow = Date.now() >= new Date(weekResult.data.pick_lock_at).getTime(); let query = supabase.from('picks').select('id,user_id,contest_game_id,selected_team,selected_spread,result').in('contest_game_id', (await supabase.from('contest_games').select('id').eq('week_id', weekId)).data?.map((row) => row.id) ?? []); if (!publicNow) query = query.eq('user_id', session.userId);
 const picks = await query; if (picks.error) return NextResponse.json({ error: 'Picks could not be loaded.' }, { status: 500 }); return NextResponse.json({ picks: picks.data, public: publicNow });
}
