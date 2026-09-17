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

/**
 * Decide quantos grupos e tamanhos equilibrados.
 * Evita “um único grupo principal” quando há jogadores suficientes para dividir.
 */
export function planGroupDivision(
  playerCount: number,
  targetSize: number,
): { groupCount: number; sizes: number[] } {
  if (playerCount < 2) {
    throw new Error('É preciso pelo menos 2 jogadores');
  }

  const target = Math.min(Math.max(Math.floor(targetSize) || 4, 2), 16);

  // base: quantos grupos cabem com o tamanho alvo
  let groupCount = Math.max(1, Math.ceil(playerCount / target));

  // com 6+ jogadores, nunca ficar em 1 grupo só (campeonato de verdade)
  if (playerCount >= 6) {
    groupCount = Math.max(groupCount, 2);
  }
  // com 10+ e alvo pequeno, preferir mais grupos equilibrados (~4)
  if (playerCount >= 10) {
    const preferred = Math.round(playerCount / Math.min(target, 4));
    groupCount = Math.max(groupCount, preferred);
  }

  // se algum grupo ficaria muito maior que o alvo, cria mais grupos
  while (Math.ceil(playerCount / groupCount) > target + 1) {
    groupCount += 1;
  }

  // cada grupo precisa de pelo menos 2
  while (groupCount > 1 && Math.floor(playerCount / groupCount) < 2) {
    groupCount -= 1;
  }

  const base = Math.floor(playerCount / groupCount);
  const rem = playerCount % groupCount;
  const sizes = Array.from({ length: groupCount }, (_, i) => base + (i < rem ? 1 : 0));
  return { groupCount, sizes };
}

/** Split players into balanced named groups. */
export function splitIntoGroups(
  playerIds: string[],
  targetSize: number,
  random: () => number = Math.random,
): Group[] {
  const shuffled = shuffle(playerIds, random);
  const { sizes } = planGroupDivision(shuffled.length, targetSize);
  const groups: Group[] = [];
  let cursor = 0;
  sizes.forEach((size, i) => {
    groups.push({
      id: createId('g'),
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      playerIds: shuffled.slice(cursor, cursor + size),
    });
    cursor += size;
  });
  return groups;
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

export function describeGroupPlan(playerCount: number, targetSize: number): string {
  if (playerCount < 2) return 'Selecione pelo menos 2 jogadores';
  const { groupCount, sizes } = planGroupDivision(playerCount, targetSize);
  const parts = sizes.map((s, i) => `Grupo ${String.fromCharCode(65 + i)}: ${s}`).join(' · ');
  return `${groupCount} grupo${groupCount > 1 ? 's' : ''} — ${parts}`;
}
