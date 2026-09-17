import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createId, normalizeStore, type Tournament } from '@shared/types';
import { parseImport } from '@shared/tournament/validate';
import { useStore } from '../storeContext';

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const { store, updateStore, activeTournament, isAdmin } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function setActive(id: string) {
    await updateStore((s) => ({ ...s, activeTournamentId: id }));
  }

  async function removeTournament(id: string) {
    if (!confirm('Remover este campeonato?')) return;
    await updateStore((s) => ({
      ...s,
      tournaments: s.tournaments.filter((t) => t.id !== id),
      activeTournamentId: s.activeTournamentId === id ? null : s.activeTournamentId,
    }));
  }

  function exportActive() {
    if (!activeTournament) {
      setErr('Nenhum campeonato ativo');
      return;
    }
    downloadJson(`${activeTournament.name.replace(/\s+/g, '_')}.json`, activeTournament);
    setMsg('Campeonato exportado');
    setErr(null);
  }

  function exportStore() {
    downloadJson('fifa-cup-store.json', store);
    setMsg('Store completo exportado');
    setErr(null);
  }

  async function onImportFile(file: File, mode: 'replace' | 'add') {
    setErr(null);
    setMsg(null);
    try {
      const text = await file.text();
      const parsed = parseImport(JSON.parse(text));

      await updateStore((s) => {
        if (parsed.kind === 'store') {
          return { ...normalizeStore(parsed.store), revision: s.revision };
        }
        const t: Tournament = {
          ...parsed.tournament,
          id: mode === 'add' ? createId('t') : parsed.tournament.id,
        };
        if (mode === 'replace' && s.activeTournamentId) {
          return {
            ...s,
            tournaments: s.tournaments.map((x) => (x.id === s.activeTournamentId ? t : x)),
            activeTournamentId: t.id,
          };
        }
        return {
          ...s,
          tournaments: [...s.tournaments, t],
          activeTournamentId: t.id,
        };
      });
      setMsg(mode === 'replace' ? 'Importado (substituiu ativo / carregou store)' : 'Campeonato adicionado');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha no import');
    }
  }

  return (
    <div className="stack">
      <h1>Início</h1>
      <p className="muted">
        Campeonato FIFA com amigos — leitura pública, edição só com login admin.
      </p>

      <div className="panel">
        <h2>Campeonato ativo</h2>
        {activeTournament ? (
          <>
            <p>
              <strong>{activeTournament.name}</strong>{' '}
              <span className="chip">{activeTournament.format}</span>{' '}
              <span className="chip">{activeTournament.status}</span>
            </p>
            <div className="row">
              <Link className="btn" to="/setup">
                Setup / Editar
              </Link>
              {activeTournament.format === 'groups_knockout' && (
                <Link className="btn secondary" to="/groups">
                  Grupos
                </Link>
              )}
              <Link className="btn secondary" to="/bracket">
                Chave (mata-mata)
              </Link>
              <Link className="btn secondary" to="/matches">
                Jogos
              </Link>
            </div>
          </>
        ) : (
          <p className="muted">
            Nenhum ativo.{' '}
            {isAdmin ? <Link to="/setup">Criar campeonato</Link> : 'Peça ao admin para criar.'}
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Todos os campeonatos</h2>
        {store.tournaments.length === 0 && <p className="muted">Ainda não há campeonatos.</p>}
        <ul className="stack">
          {store.tournaments.map((t) => (
            <li key={t.id} className="row">
              <strong>{t.name}</strong>
              <span className="chip">{t.format}</span>
              {store.activeTournamentId === t.id && <span className="chip">ativo</span>}
              {isAdmin && (
                <>
                  <button type="button" className="secondary" onClick={() => void setActive(t.id)}>
                    Ativar
                  </button>
                  <button type="button" className="danger" onClick={() => void removeTournament(t.id)}>
                    Remover
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Exportar / Importar</h2>
        <div className="row">
          <button type="button" onClick={exportActive}>
            Exportar campeonato ativo
          </button>
          <button type="button" className="secondary" onClick={exportStore}>
            Exportar store completo
          </button>
          {isAdmin && (
            <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
              Importar JSON…
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const mode = confirm(
                'OK = adicionar como novo campeonato (ou substituir store inteiro se o arquivo for store).\nCancelar = substituir o campeonato ativo (se for um torneio).',
              )
                ? 'add'
                : 'replace';
              void onImportFile(file, mode);
            }}
          />
        </div>
        {msg && <p className="success">{msg}</p>}
        {err && <p className="error">{err}</p>}
      </div>
    </div>
  );
}
