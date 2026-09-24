'use client';

import { useState } from 'react';

type SubmitPicksProps = {
  weekId: string;
  complete: number;
  locked: boolean;
};

export default function SubmitPicks({ weekId, complete, locked }: SubmitPicksProps) {
  const [tieBreakerTotal, setTieBreakerTotal] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const cardComplete = complete === 10;
  const ready = cardComplete && tieBreakerTotal !== '' && !locked;

  const submit = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/picks/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ weekId, tieBreakerTotal: Number(tieBreakerTotal) }),
      });
      const result = await response.json();
      setMessage(response.ok ? 'Picks submitted.' : result.error || 'Picks could not be submitted.');
    } catch {
      setMessage('Picks could not be submitted. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const guidance = locked
    ? 'This card is locked and can no longer be changed.'
    : cardComplete
      ? 'Enter the final-score total to submit your card.'
      : `${10 - complete} pick${complete === 9 ? '' : 's'} left before you can submit.`;

  return (
    <section className={`pick-dock ${cardComplete ? 'is-complete' : ''}`} aria-label="Pick submission">
      <div className="pick-dock__progress">
        <div>
          <span className="pick-dock__eyebrow">Your card</span>
          <strong>{complete} of 10 picks</strong>
        </div>
        <div
          className="pick-meter"
          role="progressbar"
          aria-label="Picks completed"
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={complete}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} className={index < complete ? 'is-filled' : ''} aria-hidden="true" />
          ))}
        </div>
      </div>

      <div className="pick-dock__actions">
        <label className="tiebreaker-field">
          <span>Tiebreaker total</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={tieBreakerTotal}
            onChange={(event) => setTieBreakerTotal(event.target.value)}
            placeholder="Points"
            aria-describedby="submit-guidance"
            disabled={locked}
          />
        </label>
        <button className="submit-picks-button" onClick={submit} disabled={busy || !ready}>
          {busy ? 'Submitting...' : locked ? 'Card locked' : 'Submit picks'}
        </button>
      </div>

      <p id="submit-guidance" className="pick-dock__guidance">{guidance}</p>
      {message && <p className="pick-dock__message" role="status" aria-live="polite">{message}</p>}
    </section>
  );
}
