import { useState } from 'react';
import { createId } from '@shared/types';
import { useStore } from '../storeContext';

export default function PlayersPage() {
  const { store, updateStore, isAdmin } = useStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sorted = [...store.players].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );

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
      <p className="muted">
        Pool reutilizável entre campeonatos.{' '}
        <strong style={{ color: 'var(--text)' }}>{store.players.length}</strong> cadastrado
        {store.players.length === 1 ? '' : 's'}.
      </p>
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

      <div className="panel" style={{ overflowX: 'auto' }}>
        {store.players.length === 0 ? (
          <p className="muted">Nenhum jogador ainda.</p>
        ) : (
          <table className="players-table">
            <thead>
              <tr>
                <th style={{ width: '4rem' }}>#</th>
                <th>Nome</th>
                {isAdmin && <th style={{ width: '12rem' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => (
                <tr key={p.id}>
                  <td className="muted">{idx + 1}</td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void rename(p.id)}
                        >
                          Renomear
                        </button>
                        <button type="button" className="danger" onClick={() => void remove(p.id)}>
                          Remover
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
