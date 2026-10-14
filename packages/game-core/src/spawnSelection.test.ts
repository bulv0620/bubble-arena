import { expect, test, vi } from 'vitest';
import { WHITEBOX_SPAWNS, parseSpawnCatalog, type SpawnEnemy } from '@bubble-arena/shared';
import { selectSpawnPoint } from './spawnSelection';
const catalog = parseSpawnCatalog({ collisionHash: WHITEBOX_SPAWNS.collisionHash, points: WHITEBOX_SPAWNS.points.map((p, i) => ({ ...p, position: { x: i % 4 * 10, y: 1, z: p.team === 'red' ? 0 : 50 } })) });
const enemy = (x: number, status: SpawnEnemy['status'] = 'normal', team: SpawnEnemy['team'] = 'blue', playerId = `enemy-${x}`): SpawnEnemy => ({ playerId, status, team, position: { x, y: 1, z: 0 } });
test('maximizes nearest live opponent distance instead of a sum; deterministic ID ties and original array remain immutable', () => {
  const result = selectSpawnPoint('red', [enemy(0), enemy(30)], () => true, false, catalog)!;
  expect(result.point.id).toBe('red-center'); expect(result.nearestEnemyDistance).toBe(10); expect(result.fallback).toBe(false);
  expect(selectSpawnPoint('red', [enemy(30), enemy(0)], () => true, false, { ...catalog, points: [...catalog.points].reverse() })!.point.id).toBe(result.point.id);
  expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.point.position)).toBe(true);
});
test('downed enemies count as alive; eliminated/respawning and friendly facts cannot affect own-team selection', () => {
  expect(selectSpawnPoint('red', [enemy(0, 'downed')], () => true, false, catalog)!.point.id).toBe('red-east');
  expect(selectSpawnPoint('red', [enemy(0, 'eliminated'), enemy(30, 'respawning'), enemy(10, 'normal', 'red')], () => true, false, catalog)!.point.id).toBe('red-main');
  expect(selectSpawnPoint('blue', [], () => true, false, catalog)!.point.id).toBe('blue-main');
});
test('blocked far point excluded; empty roster prefers primary, then stable alternative; all blocked returns explicit primary fallback', () => {
  expect(selectSpawnPoint('red', [enemy(0)], p => p.x !== 30, false, catalog)!.point.id).toBe('red-center');
  expect(selectSpawnPoint('red', [], p => p.x !== 0, false, catalog)!.point.id).toBe('red-center');
  const fallback = selectSpawnPoint('red', [], () => false, false, catalog)!;
  expect(fallback).toMatchObject({ point: { id: 'red-main' }, fallback: true, nearestEnemyDistance: null });
});
test('finished validates inputs but never queries; callback faults and nonboolean results never fabricate safety', () => {
  const query = vi.fn(() => true); expect(selectSpawnPoint('red', [], query, true)).toBeNull(); expect(query).not.toHaveBeenCalled();
  expect(() => selectSpawnPoint('red', [], () => undefined as unknown as boolean, false)).toThrow(TypeError);
  expect(() => selectSpawnPoint('red', [], () => { throw new Error('World released'); }, false)).toThrow('World released');
  expect(() => selectSpawnPoint('red', [], query, undefined as unknown as boolean)).toThrow(TypeError);
});
test('strict roster/team validation and distance overflow do not produce a usable point', () => {
  expect(() => selectSpawnPoint('yellow' as 'red', [], () => true, false)).toThrow(TypeError);
  expect(() => selectSpawnPoint('red', [enemy(0), enemy(0)], () => true, false)).toThrow(TypeError);
  const enormous = { ...catalog, points: catalog.points.map(p => ({ ...p, position: { x: Number.MAX_VALUE, y: 1, z: 0 } })) };
  expect(() => selectSpawnPoint('red', [enemy(-Number.MAX_VALUE)], () => true, false, enormous)).toThrow(RangeError);
});
