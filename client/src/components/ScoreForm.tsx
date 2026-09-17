import { useEffect, useState } from 'react';
import type { Match } from '@shared/types';
import { assertGroupScore, assertKnockoutScore } from '@shared/tournament/validate';
import SoftNumberInput from './SoftNumberInput';

interface Props {
  match: Match;
  nameOf: (id: string | null) => string;
  allowDraw: boolean;
  readOnly?: boolean;
  onSave: (homeScore: number, awayScore: number) => Promise<void>;
  /** Compact Libertadores-style card */
  variant?: 'default' | 'liberta';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ScoreForm({
  match,
  nameOf,
  allowDraw,
  readOnly,
  onSave,
  variant = 'default',
}: Props) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHome(match.homeScore ?? 0);
    setAway(match.awayScore ?? 0);
  }, [match.id, match.homeScore, match.awayScore]);

  const homeName = nameOf(match.homeId);
  const awayName = nameOf(match.awayId);

  if (match.status === 'bye') {
    if (variant === 'liberta') {
      return (
        <div className="lb-match lb-bye">
          <div className="lb-row">
            <span className="lb-crest">{initials(homeName)}</span>
            <span className="lb-name">{homeName}</span>
          </div>
          <div className="lb-footer">BYE — avança</div>
        </div>
      );
    }
    return (
      <div className="match-card">
        <span>{homeName}</span>
        <span className="vs">BYE</span>
        <span className="muted">avança</span>
        <span className="chip">bye</span>
      </div>
    );
  }

  if (!match.homeId || !match.awayId) {
    if (variant === 'liberta') {
      return (
        <div className="lb-match">
          <div className="lb-row">
            <span className="lb-crest">{initials(homeName)}</span>
            <span className="lb-name">{homeName}</span>
          </div>
          <div className="lb-row">
            <span className="lb-crest">{initials(awayName)}</span>
            <span className="lb-name">{awayName}</span>
          </div>
          <div className="lb-footer">Aguardando</div>
        </div>
      );
    }
    return (
      <div className="match-card">
        <span>{homeName}</span>
        <span className="vs">vs</span>
        <span>{awayName}</span>
        <span className="chip">aguardando</span>
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

  const scoreLabel =
    match.status === 'played'
      ? `${match.homeScore} x ${match.awayScore}`
      : 'A definir';

  if (variant === 'liberta') {
    const homeWon =
      match.status === 'played' &&
      match.homeScore != null &&
      match.awayScore != null &&
      match.homeScore > match.awayScore;
    const awayWon =
      match.status === 'played' &&
      match.homeScore != null &&
      match.awayScore != null &&
      match.awayScore > match.homeScore;

    return (
      <div className="lb-match">
        <div className={`lb-row${homeWon ? ' lb-winner' : ''}`}>
          <span className="lb-crest">{initials(homeName)}</span>
          <span className="lb-name">{homeName}</span>
          {match.status === 'played' && (
            <span className="lb-score">{match.homeScore}</span>
          )}
        </div>
        <div className={`lb-row${awayWon ? ' lb-winner' : ''}`}>
          <span className="lb-crest">{initials(awayName)}</span>
          <span className="lb-name">{awayName}</span>
          {match.status === 'played' && (
            <span className="lb-score">{match.awayScore}</span>
          )}
        </div>
        <div className="lb-footer">
          {readOnly ? (
            scoreLabel
          ) : (
            <div className="lb-edit">
              <SoftNumberInput value={home} min={0} max={99} onCommit={setHome} />
              <span>x</span>
              <SoftNumberInput value={away} min={0} max={99} onCommit={setAway} />
              <button type="button" disabled={busy} onClick={() => void submit()}>
                OK
              </button>
            </div>
          )}
        </div>
        {error && <p className="error lb-error">{error}</p>}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="match-card">
        <span>{homeName}</span>
        <span className="vs">
          {match.status === 'played' ? `${match.homeScore} x ${match.awayScore}` : 'vs'}
        </span>
        <span>{awayName}</span>
        <span className="chip">{match.status === 'played' ? 'jogado' : 'pendente'}</span>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="match-card">
        <span>{homeName}</span>
        <span className="vs">vs</span>
        <span>{awayName}</span>
        <div className="score-inputs">
          <SoftNumberInput value={home} min={0} max={99} onCommit={setHome} />
          <span>-</span>
          <SoftNumberInput value={away} min={0} max={99} onCommit={setAway} />
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
