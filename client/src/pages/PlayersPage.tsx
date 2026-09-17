import { useState } from 'react';
import { createId } from '@shared/types';
import { useStore } from '../storeContext';

export default function PlayersPage() {
  const { store, updateStore, isAdmin } = useStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Informe um nome');
      return;
    }
    if (store.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Já existe um jogador com esse nome');
      return;
    }
    setError(null);
    await updateStore((s) => ({
      ...s,
      players: [...s.players, { id: createId('p'), name: trimmed }],
    }));
    setName('');
  }

  async function rename(id: string) {
    const current = store.players.find((p) => p.id === id);
    if (!current) return;
    const next = prompt('Novo nome', current.name)?.trim();
    if (!next) return;
    await updateStore((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === id ? { ...p, name: next } : p)),
    }));
  }

  async function remove(id: string) {
    if (!confirm('Remover jogador do pool?')) return;
    await updateStore((s) => ({
      ...s,
      players: s.players.filter((p) => p.id !== id),
    }));
  }

  return (
    <div className="stack">
      <h1>Jogadores</h1>
      <p className="muted">Pool reutilizável entre campeonatos.</p>
      {!isAdmin && <p className="readonly-hint">Visualização — faça login admin para editar.</p>}

      {isAdmin && (
        <form className="panel row" onSubmit={(e) => void addPlayer(e)}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do amigo"
            aria-label="Nome"
          />
          <button type="submit">Adicionar</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}

      <div className="panel">
        {store.players.length === 0 && <p className="muted">Nenhum jogador ainda.</p>}
        <ul className="stack">
          {store.players.map((p) => (
            <li key={p.id} className="row">
              <strong>{p.name}</strong>
              {isAdmin && (
                <>
                  <button type="button" className="secondary" onClick={() => void rename(p.id)}>
                    Renomear
                  </button>
                  <button type="button" className="danger" onClick={() => void remove(p.id)}>
                    Remover
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
