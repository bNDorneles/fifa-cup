import { createId, type Group, type Match } from '../types.js';

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Split players into groups as evenly as possible around targetSize. */
export function splitIntoGroups(
  playerIds: string[],
  targetSize: number,
  random: () => number = Math.random,
): Group[] {
  if (playerIds.length < 2) {
    throw new Error('É preciso pelo menos 2 jogadores');
  }
  const size = Math.max(2, targetSize);
  const shuffled = shuffle(playerIds, random);
  const groupCount = Math.max(1, Math.ceil(shuffled.length / size));
  const groups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
    id: createId('g'),
    name: `Grupo ${String.fromCharCode(65 + i)}`,
    playerIds: [],
  }));

  shuffled.forEach((pid, idx) => {
    groups[idx % groupCount].playerIds.push(pid);
  });

  return groups.filter((g) => g.playerIds.length > 0);
}

export function roundRobinMatches(group: Group): Match[] {
  const ids = group.playerIds;
  const matches: Match[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({
        id: createId('m'),
        stage: 'group',
        groupId: group.id,
        homeId: ids[i],
        awayId: ids[j],
        homeScore: null,
        awayScore: null,
        status: 'pending',
      });
    }
  }
  return matches;
}

export function buildGroupsPhase(
  playerIds: string[],
  groupSize: number,
  random: () => number = Math.random,
): { groups: Group[]; matches: Match[] } {
  const groups = splitIntoGroups(playerIds, groupSize, random);
  const matches = groups.flatMap(roundRobinMatches);
  return { groups, matches };
}

/** Pad to power of 2 with null byes for single-elim seeding order. */
export function padWithByes(seeds: (string | null)[]): (string | null)[] {
  const size = nextPowerOfTwo(Math.max(2, seeds.length));
  const out = [...seeds];
  while (out.length < size) out.push(null);
  return out;
}
