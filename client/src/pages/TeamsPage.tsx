import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../storeContext';

export default function TeamsPage() {
  const { store, updateStore, activeTournament, isAdmin } = useStore();
  const [order, setOrder] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fixedTeams = Boolean(activeTournament?.settings.fixedTeams);

  const playerIds = useMemo(() => {
    if (!activeTournament) return [];
    if (order) return order.filter((id) => activeTournament.playerIds.includes(id));
    return activeTournament.playerIds;
  }, [activeTournament, order]);

  useEffect(() => {
    if (!activeTournament) return;
    const next: Record<string, string> = {};
    for (const id of activeTournament.playerIds) {
      next[id] = activeTournament.teamByPlayerId?.[id] ?? '';
    }
    setDraft(next);
  }, [activeTournament]);

  if (!activeTournament) {
    return (
      <p className="muted">
        Nenhum campeonato ativo. <Link to="/setup">Criar</Link>
      </p>
    );
  }

  if (!fixedTeams) {
    return (
      <div className="stack">
        <h1>Times</h1>
        <p className="muted">
          Este campeonato não usa times fixos. Ative em <Link to="/setup">Setup</Link> a opção
          “Usar times fixos (sorteio)”.
        </p>
      </div>
    );
  }

  function playerName(id: string) {
    return store.players.find((p) => p.id === id)?.name ?? id;
  }

  function shuffleOrder() {
    const arr = [...activeTournament!.playerIds];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr);
    setMsg('Ordem embaralhada para o sorteio na sala');
  }

  async function saveAll() {
    setError(null);
    setMsg(null);
    try {
      await updateStore((s) => ({
        ...s,
        tournaments: s.tournaments.map((t) =>
          t.id === activeTournament!.id
            ? {
                ...t,
                teamByPlayerId: Object.fromEntries(
                  activeTournament!.playerIds.map((id) => [id, (draft[id] ?? '').trim()]),
                ),
              }
            : t,
        ),
      }));
      setMsg('Times salvos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar');
    }
  }

  return (
    <div className="stack">
      <h1>Times — {activeTournament.name}</h1>
      <p className="muted">
        Digite o clube de cada jogador (ex.: Real Madrid). Use embaralhar só para a ordem da
        cerimônia.
      </p>
      {!isAdmin && <p className="readonly-hint">Visualização — login admin para editar.</p>}

      {isAdmin && (
        <div className="row">
          <button type="button" className="secondary" onClick={shuffleOrder}>
            Embaralhar ordem
          </button>
          <button type="button" onClick={() => void saveAll()}>
            Salvar times
          </button>
        </div>
      )}

      <div className="panel stack">
        {playerIds.map((id, idx) => (
          <div key={id} className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              <span className="chip">{idx + 1}</span> <strong>{playerName(id)}</strong>
            </span>
            {isAdmin ? (
              <input
                style={{ flex: 1, maxWidth: 320 }}
                value={draft[id] ?? ''}
                placeholder="Nome do time"
                onChange={(e) => setDraft((d) => ({ ...d, [id]: e.target.value }))}
              />
            ) : (
              <span className="muted">
                {activeTournament.teamByPlayerId?.[id]?.trim() || '— sem time —'}
              </span>
            )}
          </div>
        ))}
      </div>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
