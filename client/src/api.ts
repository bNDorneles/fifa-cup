import type { Store } from '@shared/types';

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error || `Erro HTTP ${res.status}`;
}

export async function fetchStore(): Promise<Store> {
  const res = await fetch('/api/store', { credentials: 'include' });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function saveStore(store: Store): Promise<Store> {
  const res = await fetch('/api/store', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(store),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchMe(): Promise<{ admin: boolean }> {
  const res = await fetch('/api/me', { credentials: 'include' });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await parseError(res));
}
