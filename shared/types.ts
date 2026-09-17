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
  /** Se true, campeonato usa times fixos e mostra a aba Times */
  fixedTeams: boolean;
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
  /** playerId -> nome do time (clube) neste campeonato */
  teamByPlayerId: Record<string, string>;
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

/** Normaliza stores antigos sem `revision` / times. */
export function normalizeTournament(raw: unknown): Tournament | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Partial<Tournament>;
  if (typeof t.id !== 'string' || typeof t.name !== 'string') return null;
  const settingsRaw = (t.settings ?? {}) as Partial<TournamentSettings>;
  return {
    id: t.id,
    name: t.name,
    format:
      t.format === 'double_elimination' ? 'double_elimination' : 'groups_knockout',
    status:
      t.status === 'completed' || t.status === 'in_progress' || t.status === 'draft'
        ? t.status
        : 'draft',
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
    settings: {
      groupSize: typeof settingsRaw.groupSize === 'number' ? settingsRaw.groupSize : 4,
      advancePerGroup:
        typeof settingsRaw.advancePerGroup === 'number' ? settingsRaw.advancePerGroup : 2,
      fixedTeams: Boolean(settingsRaw.fixedTeams),
    },
    playerIds: Array.isArray(t.playerIds) ? t.playerIds : [],
    groups: Array.isArray(t.groups) ? t.groups : [],
    matches: Array.isArray(t.matches) ? t.matches : [],
    bracket: t.bracket ?? null,
    teamByPlayerId:
      t.teamByPlayerId && typeof t.teamByPlayerId === 'object'
        ? Object.fromEntries(
            Object.entries(t.teamByPlayerId).filter(
              ([, v]) => typeof v === 'string',
            ) as [string, string][],
          )
        : {},
  };
}

export function normalizeStore(raw: unknown): Store {
  const base = emptyStore();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<Store>;
  const tournaments = Array.isArray(s.tournaments)
    ? s.tournaments.map(normalizeTournament).filter((t): t is Tournament => t != null)
    : [];
  return {
    version: typeof s.version === 'number' ? s.version : STORE_VERSION,
    revision: typeof s.revision === 'number' ? s.revision : 0,
    players: Array.isArray(s.players) ? s.players : [],
    tournaments,
    activeTournamentId:
      s.activeTournamentId === null || typeof s.activeTournamentId === 'string'
        ? s.activeTournamentId
        : null,
  };
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Rótulo do jogador com time fixo do campeonato, se houver. */
export function labelPlayer(
  playerId: string | null,
  players: Player[],
  tournament: Tournament | null | undefined,
): string {
  if (!playerId) return 'TBD';
  const name = players.find((p) => p.id === playerId)?.name ?? playerId;
  if (!tournament?.settings.fixedTeams) return name;
  const team = tournament.teamByPlayerId?.[playerId]?.trim();
  return team ? `${name} (${team})` : name;
}
