import { Link } from 'react-router-dom';
import { labelPlayer } from '@shared/types';
import { matchWinner, setMatchScore } from '@shared/tournament/bracket';
import type { Match } from '@shared/types';
import ScoreForm from '../components/ScoreForm';
import { useStore } from '../storeContext';

function stageLabel(m: Match): string {
  if (m.stage === 'group') return 'Grupo';
  if (m.stage === 'upper') return `Upper R${(m.round ?? 0) + 1}`;
  if (m.stage === 'lower') return `Lower R${(m.round ?? 0) + 1}`;
  if (m.stage === 'final') return 'Final';
  return `KO R${(m.round ?? 0) + 1}`;
}

export default function BracketPage() {
  const { store, updateStore, activeTournament, isAdmin } = useStore();

  if (!activeTournament) {
    return (
      <p className="muted">
        Nenhum campeonato ativo. <Link to="/setup">Criar</Link>
      </p>
    );
  }

  const nameOf = (id: string | null) => labelPlayer(id, store.players, activeTournament);

  const koMatches = activeTournament.matches.filter((m) => m.stage !== 'group');

  if (koMatches.length === 0) {
    return (
      <div className="stack">
        <h1>Chave</h1>
        <p className="muted">
          Ainda sem chave.{' '}
          {activeTournament.format === 'groups_knockout' ? (
            <Link to="/groups">Complete os grupos e gere a chave</Link>
          ) : (
            <Link to="/setup">Sorteie o mata-mata com repescagem</Link>
          )}
        </p>
      </div>
    );
  }

  async function saveScore(matchId: string, homeScore: number, awayScore: number) {
    const target = activeTournament!.matches.find((m) => m.id === matchId);
    if (!target) return;

    if (target.status === 'played' && target.nextMatchId) {
      const next = activeTournament!.matches.find((m) => m.id === target.nextMatchId);
      if (next && next.status === 'played') {
        if (!confirm('O próximo jogo já tem placar. Alterar mesmo assim pode inconsistir a chave. Continuar?')) {
          return;
        }
      }
    }

    const matches = setMatchScore(
      activeTournament!.matches,
      matchId,
      homeScore,
      awayScore,
      false,
    );

    // Mark completed if final played
    const final = matches.find((m) => m.stage === 'final');
    const status =
      final && final.status === 'played' ? ('completed' as const) : activeTournament!.status;

    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.map((t) =>
        t.id === activeTournament!.id ? { ...t, matches, status } : t,
      ),
    }));
  }

  const byStage = {
    upper: koMatches.filter((m) => m.stage === 'upper'),
    lower: koMatches.filter((m) => m.stage === 'lower'),
    knockout: koMatches.filter((m) => m.stage === 'knockout'),
    final: koMatches.filter((m) => m.stage === 'final'),
  };

  const champion = (() => {
    const final = byStage.final[0];
    return final ? matchWinner(final) : null;
  })();

  return (
    <div className="stack">
      <h1>Chave — {activeTournament.name}</h1>
      {champion && (
        <p className="success">
          Campeão: <strong>{nameOf(champion)}</strong>
        </p>
      )}

      {byStage.upper.length > 0 && (
        <section className="panel stack">
          <h2>Chave dos vencedores (upper)</h2>
          {byStage.upper.map((m) => (
            <div key={m.id}>
              <span className="chip">{stageLabel(m)}</span>
              <ScoreForm
                match={m}
                nameOf={nameOf}
                allowDraw={false}
                readOnly={!isAdmin}
                onSave={(h, a) => saveScore(m.id, h, a)}
              />
            </div>
          ))}
        </section>
      )}

      {byStage.lower.length > 0 && (
        <section className="panel stack">
          <h2>Repescagem (lower)</h2>
          {byStage.lower.map((m) => (
            <div key={m.id}>
              <span className="chip">{stageLabel(m)}</span>
              <ScoreForm
                match={m}
                nameOf={nameOf}
                allowDraw={false}
                readOnly={!isAdmin}
                onSave={(h, a) => saveScore(m.id, h, a)}
              />
            </div>
          ))}
        </section>
      )}

      {byStage.knockout.length > 0 && (
        <section className="panel stack">
          <h2>Mata-mata</h2>
          {byStage.knockout.map((m) => (
            <div key={m.id}>
              <span className="chip">{stageLabel(m)}</span>
              <ScoreForm
                match={m}
                nameOf={nameOf}
                allowDraw={false}
                readOnly={!isAdmin}
                onSave={(h, a) => saveScore(m.id, h, a)}
              />
            </div>
          ))}
        </section>
      )}

      {byStage.final.length > 0 && (
        <section className="panel stack">
          <h2>Final</h2>
          {byStage.final.map((m) => (
            <ScoreForm
              key={m.id}
              match={m}
              nameOf={nameOf}
              allowDraw={false}
              readOnly={!isAdmin}
              onSave={(h, a) => saveScore(m.id, h, a)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
