import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseCookie, stringifySetCookie } from 'cookie';

export const COOKIE_NAME = 'fifa_admin';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || 'admin';
}

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || 'dev-secret-change-me';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [ver, expStr, sig] = parts;
  if (ver !== 'v1') return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${ver}.${expStr}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const parsed = parseCookie(header);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function isAdminFromCookieHeader(cookieHeader: string | undefined): boolean {
  const cookies = parseCookies(cookieHeader);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

export function buildSessionCookie(token: string): string {
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function buildClearSessionCookie(): string {
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function checkLoginRateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 10;
  let entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    loginAttempts.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // still do a compare to reduce timing leak on length — hash both
    const ha = createHmac('sha256', 'len').update(provided).digest();
    const hb = createHmac('sha256', 'len').update(expected).digest();
    timingSafeEqual(ha, hb);
    return false;
  }
  return timingSafeEqual(a, b);
}
