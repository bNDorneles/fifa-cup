import { describe, expect, it } from 'vitest';
import { computeStandings } from './standings';
import type { Match } from '../types';

describe('computeStandings', () => {
  it('ranks by points, then GD, then GF', () => {
    const matches: Match[] = [
      {
        id: '1',
        stage: 'group',
        homeId: 'a',
        awayId: 'b',
        homeScore: 2,
        awayScore: 1,
        status: 'played',
      },
      {
        id: '2',
        stage: 'group',
        homeId: 'a',
        awayId: 'c',
        homeScore: 1,
        awayScore: 1,
        status: 'played',
      },
      {
        id: '3',
        stage: 'group',
        homeId: 'b',
        awayId: 'c',
        homeScore: 0,
        awayScore: 3,
        status: 'played',
      },
    ];
    const table = computeStandings(['a', 'b', 'c'], matches);
    expect(table[0].playerId).toBe('c'); // 4 pts
    expect(table[1].playerId).toBe('a'); // 4 pts, worse GD than c? c: W1 D1 = 4, GF 4 GA 1 = +3; a: W1 D1 = 4, GF 3 GA 2 = +1
    expect(table[2].playerId).toBe('b');
    expect(table[0].points).toBe(4);
    expect(table[1].points).toBe(4);
  });
});
