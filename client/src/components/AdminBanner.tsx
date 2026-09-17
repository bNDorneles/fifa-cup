import { useState } from 'react';
import { useStore } from '../storeContext';

export default function AdminBanner() {
  const { isAdmin, authLoading, login, logout } = useStore();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (authLoading) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      setPassword('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={`auth-banner ${isAdmin ? 'admin' : 'guest'}`}>
        {isAdmin ? (
          <>
            <span>Modo admin — você pode editar o campeonato</span>
            <button type="button" className="secondary" onClick={() => void logout()}>
              Sair
            </button>
          </>
        ) : (
          <>
            <span>Modo visualização — só o admin lança placares e altera dados</span>
            <button type="button" onClick={() => setOpen(true)}>
              Login admin
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="modal panel"
            role="dialog"
            aria-label="Login admin"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Login admin</h2>
            <form className="stack" onSubmit={(e) => void onSubmit(e)}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoFocus
              />
              {error && <p className="error">{error}</p>}
              <div className="row">
                <button type="submit" disabled={busy}>
                  Entrar
                </button>
                <button type="button" className="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
