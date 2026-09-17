import { createId, emptyStore } from '../shared/types.js';
import { buildGroupsPhase } from '../shared/tournament/draw.js';
import {
  buildDoubleElimination,
  buildSingleElimination,
  groupsComplete,
  seedsFromGroups,
  setMatchScore,
} from '../shared/tournament/bracket.js';

const store = emptyStore();
const players = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eva', 'Felipe', 'Gabi', 'Hugo'].map((name) => ({
  id: createId('p'),
  name,
}));
store.players = players;

const gIds = players.slice(0, 6).map((p) => p.id);
const { groups, matches } = buildGroupsPhase(gIds, 3, () => 0.3);
let gMatches = matches;
for (const m of [...gMatches]) {
  if (m.status === 'pending') {
    gMatches = setMatchScore(gMatches, m.id, 2, 1, true);
  }
}
if (!groupsComplete(groups, gMatches)) throw new Error('groups not complete');
const seeds = seedsFromGroups(groups, gMatches, 2);
const ko = buildSingleElimination(seeds);

const deIds = players.map((p) => p.id);
const de = buildDoubleElimination(deIds, () => 0.4);

const t1 = {
  id: createId('t'),
  name: 'Smoke Groups',
  format: 'groups_knockout' as const,
  status: 'in_progress' as const,
  createdAt: new Date().toISOString(),
  settings: { groupSize: 3, advancePerGroup: 2 },
  playerIds: gIds,
  groups,
  matches: [...gMatches.filter((m) => m.stage === 'group'), ...ko.matches],
  bracket: ko.bracket,
};

const t2 = {
  id: createId('t'),
  name: 'Smoke Double',
  format: 'double_elimination' as const,
  status: 'in_progress' as const,
  createdAt: new Date().toISOString(),
  settings: { groupSize: 4, advancePerGroup: 2 },
  playerIds: deIds,
  groups: [],
  matches: de.matches,
  bracket: de.bracket,
};

store.tournaments = [t1, t2];
store.activeTournamentId = t1.id;

const put = await fetch('http://localhost:3001/api/store', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(store),
});
if (!put.ok) throw new Error(`PUT failed ${put.status}`);
const get = await fetch('http://localhost:3001/api/store');
const saved = await get.json();
console.log(
  JSON.stringify({
    ok: true,
    players: saved.players.length,
    tournaments: saved.tournaments.map((t: { name: string; matches: unknown[] }) => ({
      name: t.name,
      matches: t.matches.length,
    })),
  }),
);
