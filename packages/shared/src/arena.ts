import { PLAYER_CONFIG } from './player';
import { parseSpawnCatalog, spawnCatalogHash } from './spawn';
import { whiteboxCollisionHash } from './whitebox';
import { TRAINING_SCORE_ACTORS } from './trainingScore';
import { parseScoreRoster } from './scoring';
export interface ArenaSolid { readonly id: string; readonly kind: 'wall' | 'building' | 'cover' | 'deck' | 'ramp'; readonly position: readonly [number, number, number]; readonly size: readonly [number, number, number]; readonly rotation: readonly [number, number, number]; readonly color: string }
const solid = (id: string, kind: ArenaSolid['kind'], position: [number, number, number], size: [number, number, number], color: string, rotation: [number, number, number] = [0, 0, 0]): ArenaSolid => Object.freeze({ id, kind, position: Object.freeze(position), size: Object.freeze(size), color, rotation: Object.freeze(rotation) });
const rampAngle = Math.atan(1.5 / 5), rampLength = Math.hypot(1.5, 5);
export const ARENA_CONFIG = Object.freeze({ name: '交叉火线', width: 48, length: 56, groundTopY: 0, groundThickness: 1, deckHeight: 1.5 });
/** Every playable mass uses these exact transforms for rendering AND collision. */
export const ARENA_SOLIDS: readonly ArenaSolid[] = Object.freeze([
  solid('bound-west', 'wall', [-24, 2, 0], [1, 4, 56], '#a5b1b8'), solid('bound-east', 'wall', [24, 2, 0], [1, 4, 56], '#a5b1b8'),
  solid('bound-red', 'wall', [0, 2, 28], [48, 4, 1], '#ba8681'), solid('bound-blue', 'wall', [0, 2, -28], [48, 4, 1], '#819db6'),
  solid('red-shield', 'building', [0, 1.5, 17], [8, 3, 2], '#c98372'), solid('blue-shield', 'building', [0, 1.5, -17], [8, 3, 2], '#6b9fbc'),
  ...[-1, 1].flatMap(side => [-1, 1].map(end => solid(`hall-${side}-${end}`, 'building', [side * 7, 2, end * 7], [4, 4, 8], side < 0 ? '#8eabb2' : '#b2a18b'))),
  ...[-1, 1].flatMap(side => [-1, 1].map(end => solid(`spawn-screen-${side}-${end}`, 'building', [side * 11, 1.4, end * 18], [5, 2.8, 1.2], end > 0 ? '#c78e80' : '#7facc4'))),
  solid('mid-pillar', 'building', [0, 1.6, 0], [3.2, 3.2, 3.2], '#8c9d91'),
  solid('mid-red-cover', 'cover', [-2, .625, 6], [2.4, 1.25, 1.4], '#ccab77'), solid('mid-blue-cover', 'cover', [2, .625, -6], [2.4, 1.25, 1.4], '#ccab77'),
  solid('west-red-crate', 'cover', [-19, .9, 8], [3, 1.8, 3], '#bdac86'), solid('west-blue-crate', 'cover', [-19, .9, -8], [3, 1.8, 3], '#bdac86'),
  solid('west-link-cover', 'cover', [-10.5, .625, 0], [2.4, 1.25, 3], '#ccb489'),
  solid('east-deck', 'deck', [14, .75, 0], [8, 1.5, 14], '#9aaab7'),
  solid('east-red-ramp', 'ramp', [14, .75 - Math.cos(rampAngle) * .1, 9.5], [8, .2, rampLength], '#adc0bc', [rampAngle, 0, 0]),
  solid('east-blue-ramp', 'ramp', [14, .75 - Math.cos(rampAngle) * .1, -9.5], [8, .2, rampLength], '#adc0bc', [-rampAngle, 0, 0]),
  solid('deck-red-cover', 'cover', [11.5, 2.125, 3.5], [2, 1.25, 1.3], '#d3ba8c'), solid('deck-blue-cover', 'cover', [16.5, 2.125, -3.5], [2, 1.25, 1.3], '#d3ba8c'),
  solid('red-west-return', 'cover', [-17, .625, 18], [2, 1.25, 2], '#c99585'), solid('blue-west-return', 'cover', [-17, .625, -18], [2, 1.25, 2], '#83aec6'),
  solid('red-east-return', 'cover', [17, .625, 18], [2, 1.25, 2], '#c99585'), solid('blue-east-return', 'cover', [17, .625, -18], [2, 1.25, 2], '#83aec6'),
]);
export const ARENA_COLLISION = Object.freeze({ schemaVersion: 1, ground: Object.freeze({ width: ARENA_CONFIG.width, length: ARENA_CONFIG.length, thickness: 1, topY: 0 }), solids: Object.freeze(ARENA_SOLIDS.map(({ id, kind, position, size, rotation }) => Object.freeze({ id, kind, position, size, rotation }))) });
// Hash utility is geometry-agnostic; this overload keeps legacy whitebox identities unchanged.
export const ARENA_COLLISION_HASH = whiteboxCollisionHash(ARENA_COLLISION);
const y = PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance;
export const ARENA_SPAWNS = parseSpawnCatalog({ collisionHash: ARENA_COLLISION_HASH, points: ['red', 'blue'].flatMap(team => [-6, 6, -11, 11].map((x, i) => ({ id: `arena-${team}-${i}`, team, primary: i === 0, position: { x, y, z: team === 'red' ? 22 : -22 } }))) });
export const ARENA_SPAWN_HASH = spawnCatalogHash(ARENA_SPAWNS);
export const ARENA_DEMO_ROSTER = parseScoreRoster([TRAINING_SCORE_ACTORS.player, TRAINING_SCORE_ACTORS['enemy-a']].map(p => ({ ...p, lifeId: 1 })));
export const ARENA_BOT_CONFIG = Object.freeze({ speed: 3.2, viewRange: 28, stopDistance: 11, reactionTicks: 45, burstTicks: 20, restTicks: 72, spreadDegrees: 3.5, waypointRadius: .9 });
export const ARENA_BOT_ROUTE = Object.freeze([[-6, -22], [-6, -14], [-14, -14], [-14, 12], [-6, 13], [0, 12], [0, 6], [3.5, 2.5], [3.5, -2.5], [0, -3], [0, -14], [-14, -14]].map(([x, z]) => Object.freeze({ x, z })));
