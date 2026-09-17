import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Store, Tournament } from '@shared/types';
import { emptyStore } from '@shared/types';
import { fetchMe, fetchStore, login as apiLogin, logout as apiLogout, saveStore } from './api';

interface StoreContextValue {
  store: Store;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  authLoading: boolean;
  reload: () => Promise<void>;
  updateStore: (updater: (prev: Store) => Store) => Promise<void>;
  activeTournament: Tournament | null;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(emptyStore());
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, me] = await Promise.all([fetchStore(), fetchMe()]);
      setStore(data);
      setIsAdmin(me.admin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateStore = useCallback(
    async (updater: (prev: Store) => Store) => {
      if (!isAdmin) {
        throw new Error('Somente admin pode alterar dados');
      }
      setError(null);
      const next = updater(store);
      try {
        const saved = await saveStore(next);
        setStore(saved);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao salvar';
        setError(msg);
        if (msg.includes('revisão') || msg.includes('409')) {
          await reload();
        }
        throw e;
      }
    },
    [store, isAdmin, reload],
  );

  const login = useCallback(async (password: string) => {
    await apiLogin(password);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsAdmin(false);
  }, []);

  const activeTournament = useMemo(
    () => store.tournaments.find((t) => t.id === store.activeTournamentId) ?? null,
    [store],
  );

  const value = useMemo(
    () => ({
      store,
      loading,
      error,
      isAdmin,
      authLoading,
      reload,
      updateStore,
      activeTournament,
      login,
      logout,
    }),
    [
      store,
      loading,
      error,
      isAdmin,
      authLoading,
      reload,
      updateStore,
      activeTournament,
      login,
      logout,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore fora do provider');
  return ctx;
}
