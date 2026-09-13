import { requireAdmin } from '@/lib/server/admin';
import GamePool from '@/components/GamePool';
import Link from 'next/link';

async function loadAdminData() {
	try {
		const { supabase } = await requireAdmin();
		const [{ data: weeks }, { data: games }, { data: contestGames }] = await Promise.all([supabase.from('weeks').select('id,name,season,week_number,status,pick_lock_at').order('season', { ascending: false }).order('week_number', { ascending: false }), supabase.from('games').select('id,week_id,away_team,away_team_abbreviation,home_team,home_team_abbreviation,kickoff_at,away_score,home_score,game_status,sportsbook_spread_team,sportsbook_spread_value').order('kickoff_at'), supabase.from('contest_games').select('id,week_id,game_id,spread_team,spread_value,display_order,active').order('display_order')]);
		return { weeks: weeks ?? [], games: games ?? [], contestGames: contestGames ?? [], message: '' };
	} catch (error) {
		return { weeks: [], games: [], contestGames: [], message: error instanceof Error && error.message === 'FORBIDDEN' ? 'Commissioner access required.' : 'Sign in to access the admin area.' };
	}
}

export default async function AdminPage() {
	const { weeks, games, contestGames, message } = await loadAdminData();
	if (message) return <main className="shell" style={{ paddingTop: 64 }}><div className="empty">{message}</div></main>;
	return <><header className="topbar"><div className="topbar-inner"><div className="wordmark">CFB <span>PICKS</span></div><div className="user-chip">Commissioner settings · <Link href="/">Make your picks</Link></div></div></header><main className="shell" style={{ paddingTop: 32 }}><div className="eyebrow">CFB Pickem</div><h1>Commissioner settings</h1><p>Sync the upcoming NCAA slate, then tap the 16 games that belong in this week&apos;s pick’em. The latest selected game is automatically the tiebreaker.</p><GamePool weeks={weeks} games={games} contestGames={contestGames} /></main></>;
}
