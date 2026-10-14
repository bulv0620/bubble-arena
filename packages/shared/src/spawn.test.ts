import { expect, test } from 'vitest';
import { RESPAWN_CONFIG, WHITEBOX_SPAWNS, WHITEBOX_SPAWN_HASH, parseSpawnCatalog, parseSpawnEnemies, parseRespawnConfig, spawnCatalogHash } from './spawn';
import { WHITEBOX_COLLISION_HASH } from './whitebox';
test('catalog binds map identity, four points/one primary per team and deeply frozen independent data/hash', () => {
  expect(WHITEBOX_SPAWNS.collisionHash).toBe(WHITEBOX_COLLISION_HASH);
  for (const team of ['red', 'blue']) { const own = WHITEBOX_SPAWNS.points.filter(p => p.team === team); expect(own).toHaveLength(4); expect(own.filter(p => p.primary)).toHaveLength(1); }
  const copy = { ...WHITEBOX_SPAWNS, points: WHITEBOX_SPAWNS.points.map(p => ({ ...p, position: { ...p.position } })) }, parsed = parseSpawnCatalog(copy);
  copy.points[0].position.x++; expect(parsed.points[0].position.x).toBe(WHITEBOX_SPAWNS.points[0].position.x);
  expect(Object.isFrozen(parsed.points)).toBe(true); expect(Object.isFrozen(parsed.points[0].position)).toBe(true);
  expect(spawnCatalogHash(parsed)).toBe(WHITEBOX_SPAWN_HASH); expect(spawnCatalogHash(copy)).not.toBe(WHITEBOX_SPAWN_HASH);
  expect(spawnCatalogHash({ ...parsed, collisionHash: 'fnv1a64:0000000000000000' })).not.toBe(WHITEBOX_SPAWN_HASH);
});
test('catalog/roster reject getters, sparse/extra/duplicate/capacity data and missing teams/primary', () => {
  for (const points of [WHITEBOX_SPAWNS.points.slice(1), [...WHITEBOX_SPAWNS.points, WHITEBOX_SPAWNS.points[0]], WHITEBOX_SPAWNS.points.map(p => ({ ...p, primary: false }))]) expect(() => parseSpawnCatalog({ ...WHITEBOX_SPAWNS, points })).toThrow();
  expect(() => parseSpawnCatalog({ ...WHITEBOX_SPAWNS, collisionHash: 'other' })).toThrow(TypeError);
  expect(() => parseSpawnCatalog({ ...WHITEBOX_SPAWNS, extra: 1 })).toThrow(TypeError);
  expect(() => parseSpawnEnemies(new Array(1))).toThrow(TypeError);
  const e = { playerId: 'enemy', team: 'blue', status: 'normal', position: { x: 0, y: 1, z: 0 } };
  expect(() => parseSpawnEnemies([e, e])).toThrow(TypeError); expect(() => parseSpawnEnemies(Array.from({ length: 9 }, (_, i) => ({ ...e, playerId: String(i) })))).toThrow(TypeError);
  expect(() => parseSpawnEnemies([Object.defineProperty({ ...e }, 'position', { get: () => { throw new Error('Must not read'); } })])).toThrow(TypeError);
  expect(() => parseSpawnEnemies([ { ...e, status: 'alive' } ])).toThrow(TypeError);
  const array = [e]; Object.defineProperty(array, '0', { get: () => { throw new Error('Must not read'); } }); expect(() => parseSpawnEnemies(array)).toThrow(TypeError);
  expect(Object.isFrozen(parseSpawnEnemies([e])[0].position)).toBe(true);
});
test('respawn protection/clearance strictly parse finite safe durations and preserve configured values independently', () => {
  expect(RESPAWN_CONFIG.protectionDuration).toBe(2); expect(Object.isFrozen(RESPAWN_CONFIG)).toBe(true);
  const raw = { ...RESPAWN_CONFIG }, parsed = parseRespawnConfig(raw); raw.protectionDuration = 3; expect(parsed.protectionDuration).toBe(2);
  for (const d of [0, -1, Infinity, NaN, Number.MAX_SAFE_INTEGER]) expect(() => parseRespawnConfig({ ...RESPAWN_CONFIG, protectionDuration: d })).toThrow(RangeError);
  for (const d of [0, -1, Infinity, 1]) expect(() => parseRespawnConfig({ ...RESPAWN_CONFIG, clearance: d })).toThrow(RangeError);
  expect(() => parseRespawnConfig({ ...RESPAWN_CONFIG, extra: true })).toThrow(TypeError);
});
