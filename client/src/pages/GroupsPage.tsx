import { Link } from 'react-router-dom';
import { labelPlayer } from '@shared/types';
import {
  buildSingleElimination,
  groupsComplete,
  seedsFromGroups,
  setMatchScore,
} from '@shared/tournament/bracket';
import { computeStandings } from '@shared/tournament/standings';
import ScoreForm from '../components/ScoreForm';
import { useStore } from '../storeContext';

export default function GroupsPage() {
  const { store, updateStore, activeTournament, isAdmin } = useStore();

  if (!activeTournament) {
    return (
      <p className="muted">
        Nenhum campeonato ativo. <Link to="/setup">Criar</Link>
      </p>
    );
  }

  if (activeTournament.format !== 'groups_knockout') {
    return <p className="muted">Este formato não usa fase de grupos.</p>;
  }

  const nameOf = (id: string | null) => labelPlayer(id, store.players, activeTournament);

  async function saveScore(matchId: string, homeScore: number, awayScore: number) {
    const matches = setMatchScore(activeTournament!.matches, matchId, homeScore, awayScore, true);
    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.map((t) =>
        t.id === activeTournament!.id ? { ...t, matches } : t,
      ),
    }));
  }

  async function generateKnockout() {
    if (!groupsComplete(activeTournament!.groups, activeTournament!.matches)) {
      alert('Ainda há jogos de grupo pendentes');
      return;
    }
    const seeds = seedsFromGroups(
      activeTournament!.groups,
      activeTournament!.matches,
      activeTournament!.settings.advancePerGroup,
    );
    if (seeds.length < 2) {
      alert('Poucos classificados para a chave');
      return;
    }
    const { bracket, matches: koMatches } = buildSingleElimination(seeds);
    const groupMatches = activeTournament!.matches.filter((m) => m.stage === 'group');
    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.map((t) =>
        t.id === activeTournament!.id
          ? {
              ...t,
              bracket,
              matches: [...groupMatches, ...koMatches],
            }
          : t,
      ),
    }));
  }

  const complete = groupsComplete(activeTournament.groups, activeTournament.matches);

  return (
    <div className="stack">
      <h1>Grupos — {activeTournament.name}</h1>
      <div className="row">
        {isAdmin && (
          <button type="button" onClick={() => void generateKnockout()} disabled={!complete}>
            Gerar chave mata-mata
          </button>
        )}
        {!complete && <span className="muted">Finalize todos os jogos dos grupos</span>}
        {activeTournament.bracket && (
          <Link to="/bracket">Ir para a chave</Link>
        )}
      </div>

      <div className="grid-2">
        {activeTournament.groups.map((g) => {
          const gMatches = activeTournament.matches.filter((m) => m.groupId === g.id);
          const table = computeStandings(g.playerIds, gMatches);
          return (
            <div key={g.id} className="panel stack">
              <h2>{g.name}</h2>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jogador</th>
                    <th>P</th>
                    <th>J</th>
                    <th>SG</th>
                    <th>GP</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, i) => (
                    <tr key={row.playerId}>
                      <td>{i + 1}</td>
                      <td>{nameOf(row.playerId)}</td>
                      <td>{row.points}</td>
                      <td>{row.played}</td>
                      <td>{row.goalDiff}</td>
                      <td>{row.goalsFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>Jogos</h3>
              {gMatches.map((m) => (
                <ScoreForm
                  key={m.id}
                  match={m}
                  nameOf={nameOf}
                  allowDraw
                  readOnly={!isAdmin}
                  onSave={(h, a) => saveScore(m.id, h, a)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
