import { describe, expect, it } from 'vitest';
import {
  buildDoubleElimination,
  buildSingleElimination,
  matchWinner,
  setMatchScore,
} from './bracket';
import { assertKnockoutScore, canReshuffle, parseImport } from './validate';
import { emptyStore } from '../types';

describe('bracket', () => {
  it('builds single elim with byes for 3 players', () => {
    const { matches } = buildSingleElimination(['a', 'b', 'c']);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const byes = matches.filter((m) => m.status === 'bye');
    expect(byes.length).toBeGreaterThanOrEqual(1);
  });

  it('advances winner on score', () => {
    const { matches } = buildSingleElimination(['a', 'b', 'c', 'd']);
    const first = matches.find((m) => m.round === 0 && m.homeId && m.awayId && m.status === 'pending');
    expect(first).toBeTruthy();
    const updated = setMatchScore(matches, first!.id, 3, 1, false);
    const played = updated.find((m) => m.id === first!.id)!;
    expect(matchWinner(played)).toBe(first!.homeId);
    const next = updated.find((m) => m.id === first!.nextMatchId);
    expect(next?.homeId === first!.homeId || next?.awayId === first!.homeId).toBe(true);
  });

  it('rejects knockout draw', () => {
    const { matches } = buildSingleElimination(['a', 'b']);
    const m = matches.find((x) => x.stage === 'final' || x.round === 0)!;
    expect(() => setMatchScore(matches, m.id, 1, 1, false)).toThrow(/Empate/);
  });

  it('builds double elimination for 4 players', () => {
    const { bracket, matches } = buildDoubleElimination(['a', 'b', 'c', 'd'], () => 0.2);
    expect(bracket.type).toBe('double');
    expect(matches.some((m) => m.stage === 'upper')).toBe(true);
    expect(matches.some((m) => m.stage === 'lower')).toBe(true);
    expect(matches.some((m) => m.stage === 'final')).toBe(true);
  });
});

describe('validate', () => {
  it('assertKnockoutScore', () => {
    expect(() => assertKnockoutScore(1, 1)).toThrow();
    expect(() => assertKnockoutScore(2, 1)).not.toThrow();
  });

  it('canReshuffle', () => {
    expect(canReshuffle([{ id: '1', stage: 'group', homeId: 'a', awayId: 'b', homeScore: null, awayScore: null, status: 'pending' }])).toBe(true);
  });

  it('parseImport store', () => {
    const store = emptyStore();
    expect(parseImport(store).kind).toBe('store');
  });
});
