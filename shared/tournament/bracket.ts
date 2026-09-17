import { createId, type Bracket, type Match, type StandingRow } from '../types.js';
import { padWithByes, shuffle } from './draw.js';
import { computeStandings } from './standings.js';

function pairClassic(seeds: (string | null)[]): Array<[string | null, string | null]> {
  const n = seeds.length;
  const pairs: Array<[string | null, string | null]> = [];
  for (let i = 0; i < n / 2; i++) {
    pairs.push([seeds[i], seeds[n - 1 - i]]);
  }
  return pairs;
}

function applyByes(matches: Match[]): void {
  for (const m of matches) {
    if (m.homeId && !m.awayId) {
      m.status = 'bye';
      m.homeScore = 1;
      m.awayScore = 0;
    } else if (!m.homeId && m.awayId) {
      m.status = 'bye';
      m.homeScore = 0;
      m.awayScore = 1;
      // swap so winner is always "home" conceptually for advance helpers
      m.homeId = m.awayId;
      m.awayId = null;
      m.homeScore = 1;
      m.awayScore = 0;
    } else if (!m.homeId && !m.awayId) {
      m.status = 'bye';
    }
  }
}

export function matchWinner(m: Match): string | null {
  if (m.status === 'bye') return m.homeId;
  if (m.status !== 'played' || m.homeScore == null || m.awayScore == null) return null;
  if (m.homeScore === m.awayScore) return null;
  return m.homeScore > m.awayScore ? m.homeId : m.awayId;
}

export function matchLoser(m: Match): string | null {
  if (m.status !== 'played' || m.homeScore == null || m.awayScore == null) return null;
  if (m.homeScore === m.awayScore) return null;
  return m.homeScore > m.awayScore ? m.awayId : m.homeId;
}

function placePlayer(match: Match, slot: 'home' | 'away', playerId: string | null): void {
  if (slot === 'home') match.homeId = playerId;
  else match.awayId = playerId;
}

export function advanceFromMatch(all: Match[], match: Match): void {
  const winner = matchWinner(match);
  if (winner && match.nextMatchId && match.nextSlot) {
    const next = all.find((x) => x.id === match.nextMatchId);
    if (next) placePlayer(next, match.nextSlot, winner);
  }
  const loser = matchLoser(match);
  if (loser && match.loserNextMatchId && match.loserNextSlot) {
    const next = all.find((x) => x.id === match.loserNextMatchId);
    if (next) placePlayer(next, match.loserNextSlot, loser);
  }
}

/** Build single-elim bracket from ordered seeds (best first). */
export function buildSingleElimination(seeds: string[]): { bracket: Bracket; matches: Match[] } {
  if (seeds.length < 2) throw new Error('É preciso pelo menos 2 jogadores na chave');
  const padded = padWithByes(seeds);
  const size = padded.length;
  const roundsCount = Math.log2(size);
  const rounds: Match[][] = [];
  const all: Match[] = [];

  // Create empty matches for all rounds
  for (let r = 0; r < roundsCount; r++) {
    const count = size / Math.pow(2, r + 1);
    const roundMatches: Match[] = [];
    for (let i = 0; i < count; i++) {
      const m: Match = {
        id: createId('m'),
        stage: r === roundsCount - 1 ? 'final' : 'knockout',
        round: r,
        homeId: null,
        awayId: null,
        homeScore: null,
        awayScore: null,
        status: 'pending',
      };
      roundMatches.push(m);
      all.push(m);
    }
    rounds.push(roundMatches);
  }

  // Link rounds
  for (let r = 0; r < roundsCount - 1; r++) {
    for (let i = 0; i < rounds[r].length; i++) {
      const next = rounds[r + 1][Math.floor(i / 2)];
      rounds[r][i].nextMatchId = next.id;
      rounds[r][i].nextSlot = i % 2 === 0 ? 'home' : 'away';
    }
  }

  // Seed round 0
  const pairs = pairClassic(padded);
  pairs.forEach((pair, i) => {
    rounds[0][i].homeId = pair[0];
    rounds[0][i].awayId = pair[1];
  });

  applyByes(rounds[0]);
  for (const m of rounds[0]) {
    if (m.status === 'bye' && m.homeId) advanceFromMatch(all, m);
  }

  return { bracket: { type: 'single', rounds }, matches: all };
}

/**
 * Qualifiers from groups: take top N per group, then seed by standing order.
 * Prefer not pairing same-group winners in R1 when possible via classic seeding.
 */
export function seedsFromGroups(
  groups: { id: string; playerIds: string[] }[],
  allMatches: Match[],
  advancePerGroup: number,
): string[] {
  const qualifiers: { playerId: string; groupId: string; rank: number; points: number; gd: number; gf: number }[] = [];

  for (const g of groups) {
    const gMatches = allMatches.filter((m) => m.groupId === g.id);
    const table = computeStandings(g.playerIds, gMatches);
    table.slice(0, advancePerGroup).forEach((row, idx) => {
      qualifiers.push({
        playerId: row.playerId,
        groupId: g.id,
        rank: idx + 1,
        points: row.points,
        gd: row.goalDiff,
        gf: row.goalsFor,
      });
    });
  }

  // Order: 1sts first (by points/gd), then 2nds, etc.
  qualifiers.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  return qualifiers.map((q) => q.playerId);
}

export function groupsComplete(
  _groups: { id: string; playerIds: string[] }[],
  matches: Match[],
): boolean {
  const groupMatches = matches.filter((m) => m.stage === 'group');
  if (groupMatches.length === 0) return false;
  return groupMatches.every((m) => m.status === 'played');
}

/** Simple double-elim: upper bracket + lower bracket + one final. */
export function buildDoubleElimination(
  playerIds: string[],
  random: () => number = Math.random,
): { bracket: Bracket; matches: Match[] } {
  if (playerIds.length < 2) throw new Error('É preciso pelo menos 2 jogadores');
  const seeds = shuffle(playerIds, random);
  const padded = padWithByes(seeds);
  const size = padded.length;
  const upperRounds = Math.log2(size);

  const upper: Match[][] = [];
  const all: Match[] = [];

  for (let r = 0; r < upperRounds; r++) {
    const count = size / Math.pow(2, r + 1);
    const round: Match[] = [];
    for (let i = 0; i < count; i++) {
      const m: Match = {
        id: createId('m'),
        stage: 'upper',
        round: r,
        homeId: null,
        awayId: null,
        homeScore: null,
        awayScore: null,
        status: 'pending',
      };
      round.push(m);
      all.push(m);
    }
    upper.push(round);
  }

  for (let r = 0; r < upperRounds - 1; r++) {
    for (let i = 0; i < upper[r].length; i++) {
      const next = upper[r + 1][Math.floor(i / 2)];
      upper[r][i].nextMatchId = next.id;
      upper[r][i].nextSlot = i % 2 === 0 ? 'home' : 'away';
    }
  }

  // Lower bracket: one round per upper round (simplified)
  const lower: Match[][] = [];
  for (let r = 0; r < upperRounds; r++) {
    // For r=0, losers of upper R0: size/2 players → size/4 matches
    const lowerCount = r === 0 ? size / 4 : size / Math.pow(2, r + 2);
    const actual = Math.max(1, lowerCount);
    const round: Match[] = [];
    for (let i = 0; i < actual; i++) {
      const m: Match = {
        id: createId('m'),
        stage: 'lower',
        round: r,
        homeId: null,
        awayId: null,
        homeScore: null,
        awayScore: null,
        status: 'pending',
      };
      round.push(m);
      all.push(m);
    }
    lower.push(round);
  }

  // Wire upper losers into lower (round 0)
  for (let i = 0; i < upper[0].length; i++) {
    const lm = lower[0][Math.floor(i / 2)];
    if (!lm) continue;
    upper[0][i].loserNextMatchId = lm.id;
    upper[0][i].loserNextSlot = i % 2 === 0 ? 'home' : 'away';
  }

  // Subsequent: upper losers + previous lower winners → next lower
  for (let r = 1; r < upperRounds; r++) {
    for (let i = 0; i < upper[r].length; i++) {
      const lm = lower[r]?.[i];
      if (!lm) continue;
      upper[r][i].loserNextMatchId = lm.id;
      upper[r][i].loserNextSlot = 'home';
    }
    // previous lower winners go to away of same lower round
    if (lower[r - 1] && lower[r]) {
      for (let i = 0; i < lower[r - 1].length; i++) {
        const dest = lower[r][Math.min(i, lower[r].length - 1)];
        lower[r - 1][i].nextMatchId = dest.id;
        lower[r - 1][i].nextSlot = 'away';
      }
    }
  }

  // Final: upper champ vs lower champ
  const finalMatch: Match = {
    id: createId('m'),
    stage: 'final',
    round: 0,
    homeId: null,
    awayId: null,
    homeScore: null,
    awayScore: null,
    status: 'pending',
  };
  all.push(finalMatch);

  const lastUpper = upper[upper.length - 1][0];
  lastUpper.nextMatchId = finalMatch.id;
  lastUpper.nextSlot = 'home';

  const lastLower = lower[lower.length - 1][0];
  lastLower.nextMatchId = finalMatch.id;
  lastLower.nextSlot = 'away';

  // Seed upper R0
  const pairs = pairClassic(padded);
  pairs.forEach((pair, i) => {
    upper[0][i].homeId = pair[0];
    upper[0][i].awayId = pair[1];
  });
  applyByes(upper[0]);
  for (const m of upper[0]) {
    if (m.status === 'bye') advanceFromMatch(all, m);
  }

  const rounds = [...upper, ...lower, [finalMatch]];
  return { bracket: { type: 'double', rounds }, matches: all };
}

export function setMatchScore(
  matches: Match[],
  matchId: string,
  homeScore: number,
  awayScore: number,
  allowDraw: boolean,
): Match[] {
  const next = matches.map((m) => ({ ...m }));
  const match = next.find((m) => m.id === matchId);
  if (!match) throw new Error('Jogo não encontrado');
  if (match.homeId == null || match.awayId == null) {
    throw new Error('Jogo ainda sem os dois jogadores');
  }
  if (!allowDraw && homeScore === awayScore) {
    throw new Error('Empate não é permitido no mata-mata');
  }
  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.status = 'played';
  advanceFromMatch(next, match);
  return next;
}

export type { StandingRow };
