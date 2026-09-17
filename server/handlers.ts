import { normalizeStore, type Store } from '../shared/types.js';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  checkLoginRateLimit,
  createSessionToken,
  getAdminPassword,
  isAdminFromCookieHeader,
  passwordsMatch,
} from './auth.js';
import { getStore, RevisionConflictError, setStore } from './repo.js';

export type ApiResult = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

function isStoreShape(value: unknown): value is Store {
  if (!value || typeof value !== 'object') return false;
  const s = value as Store;
  return Array.isArray(s.players) && Array.isArray(s.tournaments);
}

export async function handleHealth(): Promise<ApiResult> {
  return { status: 200, body: { ok: true } };
}

export async function handleGetStore(): Promise<ApiResult> {
  try {
    const store = await getStore();
    return { status: 200, body: store };
  } catch (err) {
    console.error(err);
    return { status: 500, body: { error: 'Falha ao ler o store' } };
  }
}

export async function handlePutStore(
  cookieHeader: string | undefined,
  body: unknown,
): Promise<ApiResult> {
  if (!isAdminFromCookieHeader(cookieHeader)) {
    return { status: 401, body: { error: 'Não autorizado — faça login de admin' } };
  }
  if (!isStoreShape(body)) {
    return { status: 400, body: { error: 'Store inválido' } };
  }
  try {
    const incoming = normalizeStore(body);
    const saved = await setStore(incoming, { expectedRevision: incoming.revision });
    return { status: 200, body: saved };
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      return { status: 409, body: { error: err.message } };
    }
    console.error(err);
    return { status: 500, body: { error: 'Falha ao gravar o store' } };
  }
}

export async function handleLogin(
  ip: string,
  body: unknown,
): Promise<ApiResult> {
  const limit = checkLoginRateLimit(ip || 'unknown');
  if (limit.ok === false) {
    return {
      status: 429,
      body: { error: `Muitas tentativas. Aguarde ${limit.retryAfterSec}s` },
    };
  }
  const password =
    body && typeof body === 'object' && 'password' in body
      ? String((body as { password: unknown }).password ?? '')
      : '';
  if (!passwordsMatch(password, getAdminPassword())) {
    return { status: 401, body: { error: 'Senha incorreta' } };
  }
  const token = createSessionToken();
  return {
    status: 200,
    body: { ok: true, admin: true },
    headers: { 'Set-Cookie': buildSessionCookie(token) },
  };
}

export async function handleLogout(): Promise<ApiResult> {
  return {
    status: 200,
    body: { ok: true },
    headers: { 'Set-Cookie': buildClearSessionCookie() },
  };
}

export async function handleMe(cookieHeader: string | undefined): Promise<ApiResult> {
  return {
    status: 200,
    body: { admin: isAdminFromCookieHeader(cookieHeader) },
  };
}
