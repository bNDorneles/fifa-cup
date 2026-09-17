import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createId, type Tournament, type TournamentFormat } from '@shared/types';
import { buildGroupsPhase, describeGroupPlan } from '@shared/tournament/draw';
import { buildDoubleElimination } from '@shared/tournament/bracket';
import { canReshuffle } from '@shared/tournament/validate';
import SoftNumberInput from '../components/SoftNumberInput';
import { useStore } from '../storeContext';

export default function SetupPage() {
  const { store, updateStore, activeTournament, isAdmin } = useStore();
  const [name, setName] = useState('Copa da Galera');
  const [format, setFormat] = useState<TournamentFormat>('groups_knockout');
  const [groupSize, setGroupSize] = useState(4);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);
  const [fixedTeams, setFixedTeams] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const hasScores = useMemo(
    () => (activeTournament ? !canReshuffle(activeTournament.matches) : false),
    [activeTournament],
  );

  const groupPreview =
    format === 'groups_knockout' ? describeGroupPlan(selected.length, groupSize) : null;

  useEffect(() => {
    if (!activeTournament) return;
    setName(activeTournament.name);
    setFormat(activeTournament.format);
    setGroupSize(activeTournament.settings.groupSize);
    setAdvancePerGroup(activeTournament.settings.advancePerGroup);
    setFixedTeams(Boolean(activeTournament.settings.fixedTeams));
    setSelected(activeTournament.playerIds);
  }, [activeTournament?.id]);

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
      settings: { groupSize, advancePerGroup, fixedTeams },
      playerIds: selected,
      groups: [],
      matches: [],
      bracket: null,
      teamByPlayerId: {},
    };
    await updateStore((s) => ({
      ...s,
      tournaments: [...s.tournaments, t],
      activeTournamentId: t.id,
    }));
    setMsg('Campeonato criado. Agora sorteie.');
  }

  /** Salva nome/config do ativo sem apagar chave/placares (quando possível). */
  async function saveCupInfo() {
    if (!activeTournament) return;
    setError(null);
    setMsg(null);
    if (selected.length < 2) {
      setError('Selecione pelo menos 2 jogadores');
      return;
    }

    const playersChanged =
      selected.length !== activeTournament.playerIds.length ||
      selected.some((id) => !activeTournament.playerIds.includes(id));
    const formatChanged = format !== activeTournament.format;
    const structureChanged = playersChanged || formatChanged;

    if (structureChanged && hasScores) {
      setError('Já há placares — não dá para mudar jogadores/formato. Crie um campeonato novo.');
      return;
    }

    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.map((t) => {
        if (t.id !== activeTournament.id) return t;
        if (structureChanged) {
          return {
            ...t,
            name: name.trim() || t.name,
            format,
            playerIds: selected,
            settings: { groupSize, advancePerGroup, fixedTeams },
            groups: [],
            matches: [],
            bracket: null,
            status: 'draft' as const,
            teamByPlayerId: t.teamByPlayerId ?? {},
          };
        }
        return {
          ...t,
          name: name.trim() || t.name,
          settings: {
            ...t.settings,
            groupSize,
            advancePerGroup,
            fixedTeams,
          },
        };
      }),
    }));
    setMsg(
      structureChanged
        ? 'Copa atualizada (estrutura limpa — sorteie de novo).'
        : 'Informações da copa salvas.',
    );
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
    setMsg(
      next.format === 'groups_knockout'
        ? `Sorteio feito: ${next.groups.length} grupo(s).`
        : 'Sorteio da chave feito!',
    );
  }

  return (
    <div className="stack">
      <h1>Setup da copa</h1>
      {!isAdmin && (
        <p className="readonly-hint">Visualização — faça login admin para editar.</p>
      )}

      {activeTournament && (
        <div className="panel">
          <h2>Campeonato ativo</h2>
          <p>
            <strong>{activeTournament.name}</strong>{' '}
            <span className="chip">{activeTournament.format}</span>{' '}
            <span className="chip">{activeTournament.status}</span>{' '}
            <span className="chip">{activeTournament.playerIds.length} jogadores</span>
            {activeTournament.groups.length > 0 && (
              <span className="chip">{activeTournament.groups.length} grupos</span>
            )}
          </p>
          <div className="row">
            {isAdmin && (
              <button type="button" onClick={() => void draw()} disabled={hasScores}>
                {activeTournament.matches.length ? 'Re-sortear' : 'Sortear grupos/chave'}
              </button>
            )}
            {hasScores && <span className="muted">Re-sorteio bloqueado (já há placares)</span>}
            <Link to="/matches">Ver jogos</Link>
            {activeTournament.settings.fixedTeams && <Link to="/teams">Times</Link>}
          </div>
        </div>
      )}

      {isAdmin ? (
        <div className="panel stack">
          <h2>{activeTournament ? 'Editar copa' : 'Nova copa'}</h2>
          <p className="muted">
            Altere nome, formato, grupos e jogadores. Salvar estrutura (jogadores/formato) limpa o
            sorteio se ainda não houver placares.
          </p>

          <label className="row">
            Nome da copa
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
            <div className="stack">
              <div className="row">
                <SoftNumberInput
                  label="Tamanho alvo do grupo"
                  value={groupSize}
                  min={2}
                  max={64}
                  onCommit={setGroupSize}
                />
                <SoftNumberInput
                  label="Classificados por grupo"
                  value={advancePerGroup}
                  min={1}
                  max={32}
                  onCommit={setAdvancePerGroup}
                />
              </div>
              {groupPreview && (
                <p className="group-preview">
                  Divisão prevista: <strong>{groupPreview}</strong>
                </p>
              )}
            </div>
          )}

          <label className="player-check">
            <input
              type="checkbox"
              checked={fixedTeams}
              onChange={(e) => setFixedTeams(e.target.checked)}
            />
            Usar times fixos (sorteio) — libera a aba Times
          </label>

          <h3>Jogadores ({selected.length} selecionados)</h3>
          {store.players.length === 0 && (
            <p className="muted">
              Cadastre em <Link to="/players">Jogadores</Link> primeiro.
            </p>
          )}
          <div className="row" style={{ marginBottom: '0.5rem' }}>
            <button
              type="button"
              className="secondary"
              onClick={() => setSelected(store.players.map((p) => p.id))}
            >
              Selecionar todos
            </button>
            <button type="button" className="secondary" onClick={() => setSelected([])}>
              Limpar seleção
            </button>
          </div>

          <div className="panel" style={{ overflowX: 'auto', margin: 0 }}>
            <table className="players-table">
              <thead>
                <tr>
                  <th style={{ width: '3rem' }}>#</th>
                  <th style={{ width: '3rem' }} />
                  <th>Nome</th>
                </tr>
              </thead>
              <tbody>
                {store.players.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="muted">{idx + 1}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                        aria-label={`Selecionar ${p.name}`}
                      />
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row">
            <button type="button" onClick={() => void createTournament()}>
              Criar novo campeonato
            </button>
            {activeTournament && (
              <button type="button" className="secondary" onClick={() => void saveCupInfo()}>
                Salvar alterações na copa ativa
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="panel">
          <p className="muted">Faça login como admin para criar ou editar campeonatos.</p>
        </div>
      )}

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
