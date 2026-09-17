export type TournamentFormat = 'groups_knockout' | 'double_elimination';
export type TournamentStatus = 'draft' | 'in_progress' | 'completed';
export type MatchStage = 'group' | 'upper' | 'lower' | 'final' | 'knockout';
export type MatchStatus = 'pending' | 'played' | 'bye';

export interface Player {
  id: string;
  name: string;
}

export interface TournamentSettings {
  groupSize: number;
  advancePerGroup: number;
}

export interface Group {
  id: string;
  name: string;
  playerIds: string[];
}

export interface Match {
  id: string;
  stage: MatchStage;
  groupId?: string;
  round?: number;
  homeId: string | null;
  awayId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  nextMatchId?: string;
  nextSlot?: 'home' | 'away';
  loserNextMatchId?: string;
  loserNextSlot?: 'home' | 'away';
}

export interface Bracket {
  type: 'single' | 'double';
  rounds: Match[][];
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  createdAt: string;
  settings: TournamentSettings;
  playerIds: string[];
  groups: Group[];
  matches: Match[];
  bracket: Bracket | null;
}

export interface Store {
  version: number;
  /** Optimistic concurrency — incrementa a cada save no servidor */
  revision: number;
  players: Player[];
  tournaments: Tournament[];
  activeTournamentId: string | null;
}

export interface StandingRow {
  playerId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export const STORE_VERSION = 1;

export function emptyStore(): Store {
  return {
    version: STORE_VERSION,
    revision: 0,
    players: [],
    tournaments: [],
    activeTournamentId: null,
  };
}

/** Normaliza stores antigos sem `revision`. */
export function normalizeStore(raw: unknown): Store {
  const base = emptyStore();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<Store>;
  return {
    version: typeof s.version === 'number' ? s.version : STORE_VERSION,
    revision: typeof s.revision === 'number' ? s.revision : 0,
    players: Array.isArray(s.players) ? s.players : [],
    tournaments: Array.isArray(s.tournaments) ? s.tournaments : [],
    activeTournamentId:
      s.activeTournamentId === null || typeof s.activeTournamentId === 'string'
        ? s.activeTournamentId
        : null,
  };
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
