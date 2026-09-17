import { describe, expect, it } from 'vitest';
import {
  buildGroupsPhase,
  describeGroupPlan,
  nextPowerOfTwo,
  planGroupDivision,
  splitIntoGroups,
} from './draw';

const rng = () => 0.5;

describe('draw', () => {
  it('nextPowerOfTwo', () => {
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(8)).toBe(8);
  });

  it('4 jogadores com alvo 4 → 1 grupo', () => {
    const plan = planGroupDivision(4, 4);
    expect(plan.groupCount).toBe(1);
    expect(plan.sizes).toEqual([4]);
  });

  it('8 jogadores com alvo 8 → divide em 2+ grupos', () => {
    const plan = planGroupDivision(8, 8);
    expect(plan.groupCount).toBeGreaterThanOrEqual(2);
    expect(plan.sizes.reduce((a, b) => a + b, 0)).toBe(8);
  });

  it('splits into balanced groups', () => {
    const groups = splitIntoGroups(['1', '2', '3', '4', '5'], 4, rng);
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const total = groups.reduce((s, g) => s + g.playerIds.length, 0);
    expect(total).toBe(5);
  });

  it('builds round robin matches', () => {
    const { groups, matches } = buildGroupsPhase(['a', 'b', 'c', 'd'], 4, rng);
    expect(groups).toHaveLength(1);
    expect(matches).toHaveLength(6);
  });

  it('describeGroupPlan text', () => {
    expect(describeGroupPlan(12, 4)).toMatch(/grupo/i);
  });
});
