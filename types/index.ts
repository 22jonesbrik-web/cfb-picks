export type GameStatus = 'scheduled' | 'live' | 'final' | 'cancelled';
export type PickResult = 'pending' | 'win' | 'loss' | 'push';
export type WeekStatus = 'draft' | 'open' | 'closed' | 'completed';

export type Week = { id: string; season: number; weekNumber: number; name: string; status: WeekStatus; pickLockAt: string };
export type Game = { id: string; weekId: string; awayTeam: string; awayAbbr: string; awayLogo?: string; homeTeam: string; homeAbbr: string; homeLogo?: string; kickoffAt: string; awayScore?: number; homeScore?: number; sportsbookSpreadTeam?: string; sportsbookSpreadValue?: number; status: GameStatus };
export type ContestGame = { id: string; weekId: string; game: Game; spreadTeam: string; spreadValue: number; displayOrder: number };
export type Pick = { id: string; userId: string; contestGameId: string; selectedTeam: string; selectedSpread: number; confidencePoints?: number; points?: number; result: PickResult };
export type Player = { id: string; displayName: string };
