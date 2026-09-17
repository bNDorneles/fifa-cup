import { Link } from 'react-router-dom';
import { labelPlayer } from '@shared/types';
import { setMatchScore } from '@shared/tournament/bracket';
import type { Match } from '@shared/types';
import ScoreForm from '../components/ScoreForm';
import { useStore } from '../storeContext';

function label(m: Match): string {
  if (m.stage === 'group') return 'Grupo';
  if (m.stage === 'upper') return `Upper R${(m.round ?? 0) + 1}`;
  if (m.stage === 'lower') return `Lower / Repescagem R${(m.round ?? 0) + 1}`;
  if (m.stage === 'final') return 'Final';
  return `Mata-mata R${(m.round ?? 0) + 1}`;
}

export default function MatchesPage() {
  const { store, updateStore, activeTournament, isAdmin } = useStore();

  if (!activeTournament) {
    return (
      <p className="muted">
        Nenhum campeonato ativo. <Link to="/setup">Criar</Link>
      </p>
    );
  }

  const nameOf = (id: string | null) => labelPlayer(id, store.players, activeTournament);

  const pending = activeTournament.matches.filter(
    (m) => m.status === 'pending' && m.homeId && m.awayId,
  );
  const waiting = activeTournament.matches.filter(
    (m) => m.status === 'pending' && (!m.homeId || !m.awayId),
  );
  const played = activeTournament.matches.filter((m) => m.status === 'played' || m.status === 'bye');

  async function saveScore(match: Match, homeScore: number, awayScore: number) {
    const allowDraw = match.stage === 'group';
    const matches = setMatchScore(
      activeTournament!.matches,
      match.id,
      homeScore,
      awayScore,
      allowDraw,
    );
    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.map((t) =>
        t.id === activeTournament!.id ? { ...t, matches } : t,
      ),
    }));
  }

  return (
    <div className="stack">
      <h1>Jogos — {activeTournament.name}</h1>

      <section className="panel stack">
        <h2>Próximos / pendentes ({pending.length})</h2>
        {pending.length === 0 && <p className="muted">Nenhum jogo pronto no momento.</p>}
        {pending.map((m) => (
          <div key={m.id}>
            <span className="chip">{label(m)}</span>
            <ScoreForm
              match={m}
              nameOf={nameOf}
              allowDraw={m.stage === 'group'}
              readOnly={!isAdmin}
              onSave={(h, a) => saveScore(m, h, a)}
            />
          </div>
        ))}
      </section>

      {waiting.length > 0 && (
        <section className="panel stack">
          <h2>Aguardando classificação / resultado anterior</h2>
          {waiting.map((m) => (
            <div key={m.id} className="match-card">
              <span>{nameOf(m.homeId)}</span>
              <span className="vs">vs</span>
              <span>{nameOf(m.awayId)}</span>
              <span className="chip">{label(m)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="panel stack">
        <h2>Já jogados ({played.length})</h2>
        {played.map((m) => (
          <div key={m.id} className="match-card">
            <span>{nameOf(m.homeId)}</span>
            <span className="vs">
              {m.status === 'bye' ? 'BYE' : `${m.homeScore} x ${m.awayScore}`}
            </span>
            <span>{nameOf(m.awayId)}</span>
            <span className="chip">{label(m)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
