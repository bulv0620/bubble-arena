import { parseTeamId, type TeamId } from './team';
import { PLAYER_CONFIG } from './player';
import { PHYSICS_CONFIG } from './physics';
import { WHITEBOX_CONFIG, WHITEBOX_COLLISION_HASH } from './whitebox';
import { TRAINING_RANGE_CONFIG } from './trainingTarget';
import { parseRescuePosition, parseRescueTargetId, type RescuePosition } from './rescue';
import { PLAYER_LIFE_STATUSES, type PlayerLifeStatus } from './playerLife';
export type SpawnTeam = TeamId;
export interface SpawnPoint { readonly id: string; readonly team: SpawnTeam; readonly primary: boolean; readonly position: RescuePosition }
export interface SpawnCatalog { readonly collisionHash: string; readonly points: readonly SpawnPoint[] }
export interface SpawnEnemy { readonly playerId: string; readonly team: SpawnTeam; readonly status: PlayerLifeStatus; readonly position: RescuePosition }
export interface RespawnConfig { readonly protectionDuration: number; readonly clearance: number }
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== keys.length || keys.some(key => { const f = Object.getOwnPropertyDescriptor(value, key); return !f || !('value' in f); })) throw new TypeError('Invalid spawn data');
  return value as Record<string, unknown>;
}
function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum
    || Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError('Invalid spawn array');
  for (let i = 0; i < value.length; i++) { const f = Object.getOwnPropertyDescriptor(value, String(i)); if (!f || !('value' in f)) throw new TypeError('Invalid spawn element'); }
  return value;
}
export const parseSpawnTeam = parseTeamId;
export function parseRespawnConfig(value: unknown): RespawnConfig {
  const data = record(value, ['protectionDuration', 'clearance']), duration = data.protectionDuration, clearance = data.clearance;
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || !Number.isSafeInteger(Math.ceil(duration * PHYSICS_CONFIG.tickRate))
    || typeof clearance !== 'number' || !Number.isFinite(clearance) || clearance <= 0 || clearance >= PLAYER_CONFIG.spawnClearance) throw new RangeError('Invalid respawn config');
  return Object.freeze({ protectionDuration: duration, clearance });
}
export const RESPAWN_CONFIG = parseRespawnConfig({ protectionDuration: 2, clearance: .005 });
export function parseSpawnCatalog(value: unknown): SpawnCatalog {
  const data = record(value, ['collisionHash', 'points']);
  if (typeof data.collisionHash !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/.test(data.collisionHash)) throw new TypeError('Invalid spawn collision identity');
  const ids = new Set<string>(), points = array(data.points, 32).map(value => {
    const p = record(value, ['id', 'team', 'primary', 'position']), id = parseRescueTargetId(p.id);
    if (id === null || ids.has(id) || typeof p.primary !== 'boolean') throw new TypeError('Invalid spawn point'); ids.add(id);
    return Object.freeze({ id, team: parseSpawnTeam(p.team), primary: p.primary, position: parseRescuePosition(p.position) });
  });
  for (const team of ['red', 'blue']) { const own = points.filter(p => p.team === team); if (own.length < 4 || own.filter(p => p.primary).length !== 1) throw new RangeError('Each team requires four points and one primary'); }
  return Object.freeze({ collisionHash: data.collisionHash, points: Object.freeze(points) });
}
export function parseSpawnEnemies(value: unknown): readonly SpawnEnemy[] {
  const ids = new Set<string>();
  return Object.freeze(array(value, 8).map(value => {
    const p = record(value, ['playerId', 'team', 'status', 'position']), playerId = parseRescueTargetId(p.playerId);
    if (playerId === null || ids.has(playerId) || !PLAYER_LIFE_STATUSES.includes(p.status as PlayerLifeStatus)) throw new TypeError('Invalid spawn enemy'); ids.add(playerId);
    return Object.freeze({ playerId, team: parseSpawnTeam(p.team), status: p.status as PlayerLifeStatus, position: parseRescuePosition(p.position) });
  }));
}
export function spawnCatalogHash(value: SpawnCatalog): string {
  const catalog = parseSpawnCatalog(value); let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(JSON.stringify(catalog))) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
const y = WHITEBOX_CONFIG.groundTopY + PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance;
export const WHITEBOX_SPAWNS = parseSpawnCatalog({ collisionHash: WHITEBOX_COLLISION_HASH, points: [
  { id: 'red-main', team: 'red', primary: true, position: { x: TRAINING_RANGE_CONFIG.playerSpawnXZ[0], y, z: 0 } },
  { id: 'red-west', team: 'red', primary: false, position: { x: 9, y, z: 2 } },
  { id: 'red-center', team: 'red', primary: false, position: { x: 13, y, z: 2 } },
  { id: 'red-east', team: 'red', primary: false, position: { x: 15, y, z: 0 } },
  { id: 'blue-main', team: 'blue', primary: true, position: { x: 10.88, y, z: -14 } },
  { id: 'blue-west', team: 'blue', primary: false, position: { x: 9, y, z: -16 } },
  { id: 'blue-center', team: 'blue', primary: false, position: { x: 13, y, z: -16 } },
  { id: 'blue-east', team: 'blue', primary: false, position: { x: 15, y, z: -14 } },
] });
export const WHITEBOX_SPAWN_HASH = spawnCatalogHash(WHITEBOX_SPAWNS);
