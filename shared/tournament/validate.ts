import { STORE_VERSION, normalizeStore, type Match, type Store, type Tournament } from '../types.js';

export function assertKnockoutScore(homeScore: number, awayScore: number): void {
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    throw new Error('Placar deve ser número inteiro');
  }
  if (homeScore < 0 || awayScore < 0) {
    throw new Error('Placar não pode ser negativo');
  }
  if (homeScore === awayScore) {
    throw new Error('Empate não é permitido no mata-mata');
  }
}

export function assertGroupScore(homeScore: number, awayScore: number): void {
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    throw new Error('Placar deve ser número inteiro');
  }
  if (homeScore < 0 || awayScore < 0) {
    throw new Error('Placar não pode ser negativo');
  }
}

export function canReshuffle(matches: Match[]): boolean {
  return !matches.some((m) => m.status === 'played');
}

export function isStore(value: unknown): value is Store {
  if (!value || typeof value !== 'object') return false;
  const s = value as Store;
  return (
    typeof s.version === 'number' &&
    Array.isArray(s.players) &&
    Array.isArray(s.tournaments) &&
    (s.activeTournamentId === null || typeof s.activeTournamentId === 'string')
  );
}

export function isTournament(value: unknown): value is Tournament {
  if (!value || typeof value !== 'object') return false;
  const t = value as Tournament;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    (t.format === 'groups_knockout' || t.format === 'double_elimination') &&
    Array.isArray(t.playerIds) &&
    Array.isArray(t.matches)
  );
}

export type ImportPayload =
  | { kind: 'store'; store: Store }
  | { kind: 'tournament'; tournament: Tournament };

export function parseImport(raw: unknown): ImportPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('JSON inválido');
  }
  const obj = raw as Record<string, unknown>;

  if (isStore(obj)) {
    if (obj.version !== STORE_VERSION) {
      throw new Error(`Versão do store não suportada: ${obj.version}`);
    }
    return { kind: 'store', store: normalizeStore(obj) };
  }

  if (isTournament(obj)) {
    return { kind: 'tournament', tournament: obj };
  }

  // Wrapped { tournament: {...} }
  if (obj.tournament && isTournament(obj.tournament)) {
    return { kind: 'tournament', tournament: obj.tournament };
  }

  throw new Error('Arquivo não é um store nem um campeonato válido');
}
