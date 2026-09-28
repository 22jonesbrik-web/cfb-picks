'use client';

import { useState } from 'react';
import { CONFIDENCE_POINTS, getHighestUnusedConfidence } from '@/lib/picks/weights';
import type { ContestGame, Pick } from '@/types';

type SaveResult = { ok: true } | { ok: false; error: string };

type PickCardProps = {
  game: ContestGame;
  pick?: Pick;
  usedConfidencePoints: number[];
  locked: boolean;
  gameLocked: boolean;
  formatKickoff: (date: string) => string;
  displaySpread: (game: ContestGame, team: string) => string;
  onSave: (game: ContestGame, team: string, confidencePoints: number) => Promise<SaveResult>;
};

export default function PickCard({ game, pick, usedConfidencePoints, locked, gameLocked, formatKickoff, displaySpread, onSave }: PickCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedLogos, setFailedLogos] = useState({ away: false, home: false });
  const unavailable = new Set(usedConfidencePoints);
  const nextConfidence = getHighestUnusedConfidence(usedConfidencePoints);
  const disabled = locked || gameLocked || busy;

  const save = async (team: string, confidencePoints: number | null) => {
    if (disabled || confidencePoints === null) return;
    setBusy(true);
    setError('');
    const result = await onSave(game, team, confidencePoints);
    if (!result.ok) setError(result.error);
    setBusy(false);
  };

  const renderTeam = (side: 'away' | 'home') => {
    const team = side === 'away' ? game.game.awayTeam : game.game.homeTeam;
    const abbr = side === 'away' ? game.game.awayAbbr : game.game.homeAbbr;
    const logo = side === 'away' ? game.game.awayLogo : game.game.homeLogo;
    const selected = pick?.selectedTeam === team;
    return (
      <button
        type="button"
        className={`team-pick ${selected ? 'selected' : ''}`}
        disabled={disabled || (!pick && nextConfidence === null)}
        aria-pressed={selected}
        onClick={() => save(team, pick?.confidencePoints ?? nextConfidence)}
      >
        <span className="team-identity">
          {logo && !failedLogos[side] ? <img className="team-logo" src={logo} alt="" width="32" height="32" loading="lazy" decoding="async" onError={() => setFailedLogos((current) => ({ ...current, [side]: true }))} /> : <span className="team-logo-fallback" aria-hidden="true">{abbr.slice(0, 2)}</span>}
          <span><span className="team-abbr">{abbr}</span><span className="team-name">{team}</span></span>
        </span>
        <span className="spread">{displaySpread(game, team)}</span>
      </button>
    );
  };

  const status = error || (busy ? 'Saving pick...' : pick ? `${locked || gameLocked ? 'Final pick' : 'Saved'} · ${pick.selectedTeam} · ${pick.confidencePoints} pts` : 'Choose a team to assign confidence.');

  return (
    <article className={`game-card ${pick ? 'has-pick' : ''}`}>
      <div className="game-meta"><span>{formatKickoff(game.game.kickoffAt)}</span><span>{locked || gameLocked ? 'LOCKED' : 'OPEN'}</span></div>
      <div className="teams">{renderTeam('away')}<span className="versus" aria-hidden="true">@</span>{renderTeam('home')}</div>
      <div className="pick-controls">
        <label className="confidence-control">
          <span>Confidence</span>
          <select
            value={pick?.confidencePoints ?? ''}
            disabled={disabled || !pick}
            aria-describedby={`pick-status-${game.id}`}
            onChange={(event) => save(pick!.selectedTeam, Number(event.target.value))}
          >
            <option value="" disabled>Choose</option>
            {CONFIDENCE_POINTS.map((value) => <option key={value} value={value} disabled={unavailable.has(value)}>{value}{unavailable.has(value) ? ' · used' : ''}</option>)}
          </select>
        </label>
        <div id={`pick-status-${game.id}`} className={`saved ${error ? 'pick-error' : ''}`} role="status" aria-live="polite">{status}</div>
      </div>
    </article>
  );
}

