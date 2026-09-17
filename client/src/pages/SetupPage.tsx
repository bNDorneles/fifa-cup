import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createId, type Tournament, type TournamentFormat } from '@shared/types';
import { buildGroupsPhase } from '@shared/tournament/draw';
import { buildDoubleElimination } from '@shared/tournament/bracket';
import { canReshuffle } from '@shared/tournament/validate';
import { useStore } from '../storeContext';

export default function SetupPage() {
  const { store, updateStore, activeTournament, isAdmin } = useStore();
  const [name, setName] = useState('Copa da Galera');
  const [format, setFormat] = useState<TournamentFormat>('groups_knockout');
  const [groupSize, setGroupSize] = useState(4);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const hasScores = useMemo(
    () => (activeTournament ? !canReshuffle(activeTournament.matches) : false),
    [activeTournament],
  );

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createTournament() {
    setError(null);
    setMsg(null);
    if (selected.length < 2) {
      setError('Selecione pelo menos 2 jogadores');
      return;
    }
    const t: Tournament = {
      id: createId('t'),
      name: name.trim() || 'Campeonato',
      format,
      status: 'draft',
      createdAt: new Date().toISOString(),
      settings: { groupSize, advancePerGroup },
      playerIds: selected,
      groups: [],
      matches: [],
      bracket: null,
    };
    await updateStore((s) => ({
      ...s,
      tournaments: [...s.tournaments, t],
      activeTournamentId: t.id,
    }));
    setMsg('Campeonato criado. Agora sorteie.');
  }

  async function draw() {
    setError(null);
    setMsg(null);
    if (!activeTournament) {
      setError('Crie ou ative um campeonato primeiro');
      return;
    }
    if (activeTournament.playerIds.length < 2) {
      setError('É preciso pelo menos 2 jogadores');
      return;
    }
    if (hasScores) {
      setError('Já há placares — não é possível re-sortear');
      return;
    }

    let next: Tournament;
    if (activeTournament.format === 'groups_knockout') {
      const { groups, matches } = buildGroupsPhase(
        activeTournament.playerIds,
        activeTournament.settings.groupSize,
      );
      next = {
        ...activeTournament,
        groups,
        matches,
        bracket: null,
        status: 'in_progress',
      };
    } else {
      const { bracket, matches } = buildDoubleElimination(activeTournament.playerIds);
      next = {
        ...activeTournament,
        groups: [],
        matches,
        bracket,
        status: 'in_progress',
      };
    }

    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.map((t) => (t.id === next.id ? next : t)),
    }));
    setMsg('Sorteio feito!');
  }

  async function applyPlayersToActive() {
    if (!activeTournament) return;
    if (hasScores) {
      setError('Não dá para mudar jogadores após placares');
      return;
    }
    if (selected.length < 2) {
      setError('Selecione pelo menos 2 jogadores');
      return;
    }
    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.map((t) =>
        t.id === activeTournament.id
          ? {
              ...t,
              playerIds: selected,
              settings: { groupSize, advancePerGroup },
              format,
              name: name.trim() || t.name,
              groups: [],
              matches: [],
              bracket: null,
              status: 'draft',
            }
          : t,
      ),
    }));
    setMsg('Setup atualizado no campeonato ativo');
  }

  return (
    <div className="stack">
      <h1>Setup / Sorteio</h1>
      {!isAdmin && <p className="readonly-hint">Visualização — faça login admin para sortear ou criar.</p>}

      {activeTournament && (
        <div className="panel">
          <p>
            Ativo: <strong>{activeTournament.name}</strong>{' '}
            <span className="chip">{activeTournament.format}</span>{' '}
            <span className="chip">{activeTournament.matches.length} jogos</span>
          </p>
          <div className="row">
            {isAdmin && (
              <button type="button" onClick={() => void draw()} disabled={hasScores}>
                {activeTournament.matches.length ? 'Re-sortear' : 'Sortear'}
              </button>
            )}
            {hasScores && <span className="muted">Re-sorteio bloqueado (já há placares)</span>}
            <Link to="/matches">Ver jogos</Link>
          </div>
        </div>
      )}

      {isAdmin ? (
        <div className="panel stack">
          <h2>Criar ou ajustar</h2>
          <label className="row">
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="row">
            Formato
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            >
              <option value="groups_knockout">Grupos + mata-mata</option>
              <option value="double_elimination">Mata-mata com repescagem</option>
            </select>
          </label>
          {format === 'groups_knockout' && (
            <div className="row">
              <label>
                Tamanho alvo do grupo{' '}
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                />
              </label>
              <label>
                Classificados por grupo{' '}
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={advancePerGroup}
                  onChange={(e) => setAdvancePerGroup(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          <h3>Jogadores</h3>
          {store.players.length === 0 && (
            <p className="muted">
              Cadastre em <Link to="/players">Jogadores</Link> primeiro.
            </p>
          )}
          <div>
            {store.players.map((p) => (
              <label key={p.id} className="player-check">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggle(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>

          <div className="row">
            <button type="button" onClick={() => void createTournament()}>
              Criar novo campeonato
            </button>
            {activeTournament && (
              <button type="button" className="secondary" onClick={() => void applyPlayersToActive()}>
                Aplicar no ativo (sem placares)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="panel">
          <p className="muted">Faça login como admin para criar campeonatos e sortear.</p>
        </div>
      )}

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
