import { useState } from 'react';
import type { Match } from '@shared/types';
import { assertGroupScore, assertKnockoutScore } from '@shared/tournament/validate';

interface Props {
  match: Match;
  nameOf: (id: string | null) => string;
  allowDraw: boolean;
  readOnly?: boolean;
  onSave: (homeScore: number, awayScore: number) => Promise<void>;
}

export default function ScoreForm({ match, nameOf, allowDraw, readOnly, onSave }: Props) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (match.status === 'bye') {
    return (
      <div className="match-card">
        <span>{nameOf(match.homeId)}</span>
        <span className="vs">BYE</span>
        <span className="muted">avança</span>
        <span className="chip">bye</span>
      </div>
    );
  }

  if (!match.homeId || !match.awayId) {
    return (
      <div className="match-card">
        <span>{nameOf(match.homeId)}</span>
        <span className="vs">vs</span>
        <span>{nameOf(match.awayId)}</span>
        <span className="chip">aguardando</span>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="match-card">
        <span>{nameOf(match.homeId)}</span>
        <span className="vs">
          {match.status === 'played' ? `${match.homeScore} x ${match.awayScore}` : 'vs'}
        </span>
        <span>{nameOf(match.awayId)}</span>
        <span className="chip">{match.status === 'played' ? 'jogado' : 'pendente'}</span>
      </div>
    );
  }

  async function submit() {
    setError(null);
    try {
      if (allowDraw) assertGroupScore(home, away);
      else assertKnockoutScore(home, away);
      setBusy(true);
      await onSave(home, away);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="match-card">
        <span>{nameOf(match.homeId)}</span>
        <span className="vs">vs</span>
        <span>{nameOf(match.awayId)}</span>
        <div className="score-inputs">
          <input
            type="number"
            min={0}
            value={home}
            onChange={(e) => setHome(Number(e.target.value))}
          />
          <span>-</span>
          <input
            type="number"
            min={0}
            value={away}
            onChange={(e) => setAway(Number(e.target.value))}
          />
          <button type="button" disabled={busy} onClick={() => void submit()}>
            Salvar
          </button>
        </div>
      </div>
      {match.status === 'played' && (
        <span className="muted">
          Atual: {match.homeScore} x {match.awayScore}
        </span>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
