import { Link } from 'react-router-dom';
import { labelPlayer, type Match } from '@shared/types';
import { matchWinner, setMatchScore } from '@shared/tournament/bracket';
import ScoreForm from '../components/ScoreForm';
import { useStore } from '../storeContext';

function roundName(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIndex;
  if (fromEnd <= 1) return 'Final';
  if (fromEnd === 2) return 'Semifinais';
  if (fromEnd === 3) return 'Quartas de Final';
  if (fromEnd === 4) return 'Oitavas de Final';
  if (fromEnd === 5) return '16-avos de Final';
  return `Rodada ${roundIndex + 1}`;
}

function groupByRound(matches: Match[]): Match[][] {
  if (matches.length === 0) return [];
  const maxRound = Math.max(...matches.map((m) => m.round ?? 0));
  const rounds: Match[][] = [];
  for (let r = 0; r <= maxRound; r++) {
    const list = matches.filter((m) => (m.round ?? 0) === r);
    if (list.length) rounds.push(list);
  }
  return rounds;
}

function LibertadoresTree({
  matches,
  nameOf,
  isAdmin,
  onSave,
  title,
}: {
  matches: Match[];
  nameOf: (id: string | null) => string;
  isAdmin: boolean;
  onSave: (id: string, h: number, a: number) => Promise<void>;
  title: string;
}) {
  const rounds = groupByRound(matches);
  if (rounds.length === 0) return null;
  const total = rounds.length;

  return (
    <section className="lb-section">
      <div className="lb-header">
        <div>
          <h2 className="lb-title">{title}</h2>
          <p className="lb-sub">Fase de mata-mata</p>
        </div>
        <div className="lb-badge" aria-hidden>
          <span className="lb-trophy-mark" />
          <span>MATA-MATA</span>
        </div>
      </div>

      <div className="lb-scroll">
        <div
          className="lb-tree"
          style={{ gridTemplateColumns: `repeat(${total}, minmax(220px, 1fr))` }}
        >
          {rounds.map((roundMatches, ri) => (
            <div key={ri} className="lb-round">
              <h3 className="lb-round-title">{roundName(ri, total)}</h3>
              <div
                className="lb-round-matches"
                style={{
                  // espalha verticalmente para alinhar com a coluna seguinte
                  gap: `${Math.max(0.75, Math.pow(2, ri) * 0.9)}rem`,
                  paddingTop: `${Math.max(0, (Math.pow(2, ri) - 1) * 1.1)}rem`,
                }}
              >
                {roundMatches.map((m) => (
                  <div key={m.id} className="lb-slot">
                    <ScoreForm
                      match={m}
                      nameOf={nameOf}
                      allowDraw={false}
                      readOnly={!isAdmin}
                      variant="liberta"
                      onSave={(h, a) => onSave(m.id, h, a)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="lb-footnote">* Resultados atualizados em tempo real no campeonato</p>
    </section>
  );
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
        if (
          !confirm(
            'O próximo jogo já tem placar. Alterar mesmo assim pode inconsistir a chave. Continuar?',
          )
        ) {
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

  const upper = koMatches.filter((m) => m.stage === 'upper');
  const lower = koMatches.filter((m) => m.stage === 'lower');
  const knockout = koMatches.filter((m) => m.stage === 'knockout' || m.stage === 'final');
  // single-elim: knockout rounds + final together for one tree
  const singleTree = koMatches.filter(
    (m) => m.stage === 'knockout' || (m.stage === 'final' && upper.length === 0),
  );
  const doubleFinal = koMatches.filter((m) => m.stage === 'final' && upper.length > 0);

  const champion = (() => {
    const final = koMatches.find((m) => m.stage === 'final');
    return final ? matchWinner(final) : null;
  })();

  return (
    <div className="stack lb-page">
      <div className="lb-page-head">
        <div>
          <p className="lb-kicker">Campeonato profissional</p>
          <h1>{activeTournament.name}</h1>
        </div>
        {champion && (
          <p className="lb-champ">
            Campeão: <strong>{nameOf(champion)}</strong>
          </p>
        )}
      </div>

      {upper.length > 0 ? (
        <>
          <LibertadoresTree
            title={`${activeTournament.name} — Chave principal`}
            matches={upper}
            nameOf={nameOf}
            isAdmin={isAdmin}
            onSave={saveScore}
          />
          {lower.length > 0 && (
            <LibertadoresTree
              title="Repescagem"
              matches={lower}
              nameOf={nameOf}
              isAdmin={isAdmin}
              onSave={saveScore}
            />
          )}
          {doubleFinal.length > 0 && (
            <LibertadoresTree
              title="Grande Final"
              matches={doubleFinal}
              nameOf={nameOf}
              isAdmin={isAdmin}
              onSave={saveScore}
            />
          )}
        </>
      ) : (
        <LibertadoresTree
          title={activeTournament.name}
          matches={singleTree.length ? singleTree : knockout}
          nameOf={nameOf}
          isAdmin={isAdmin}
          onSave={saveScore}
        />
      )}
    </div>
  );
}
