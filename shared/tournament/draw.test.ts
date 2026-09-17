import { describe, expect, it } from 'vitest';
import { buildGroupsPhase, nextPowerOfTwo, splitIntoGroups } from './draw';

const rng = () => 0.5;

describe('draw', () => {
  it('nextPowerOfTwo', () => {
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(8)).toBe(8);
  });

  it('splits into balanced groups', () => {
    const groups = splitIntoGroups(['1', '2', '3', '4', '5'], 4, rng);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const total = groups.reduce((s, g) => s + g.playerIds.length, 0);
    expect(total).toBe(5);
  });

  it('builds round robin matches', () => {
    const { groups, matches } = buildGroupsPhase(['a', 'b', 'c', 'd'], 4, rng);
    expect(groups).toHaveLength(1);
    expect(matches).toHaveLength(6);
  });
});
