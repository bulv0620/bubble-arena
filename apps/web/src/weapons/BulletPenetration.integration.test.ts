import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { ARENA_COLLISION, ARENA_COLLISION_HASH, ARENA_SOLIDS, WHITEBOX_COLLISION, WHITEBOX_COLLISION_HASH, WHITEBOX_SPAWNS, ARENA_SPAWNS,
  BLOCK_AVATAR_CONFIG as avatar, COLLISION_GROUPS, WEAPON_CONFIGS, whiteboxCollisionHash, type BulletMaterial, type WeaponId } from '@bubble-arena/shared';
import { TrainingTargets } from './TrainingTargets';
import { LocalTrainingTarget } from './LocalTrainingTarget';
import { queryMuzzleRay } from './muzzleRay';
import { ShotFeedback } from '../effects/ShotFeedback';
import { LocalBubbleFlight } from './LocalBubbleFlight';
let world: RAPIER.World;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => world?.free());
const origin = { x: 0, y: 1 + avatar.bodyY, z: 0 }, muzzle = { ...origin, z: -.1 }, direction = { x: 0, y: 0, z: -1 };
function setup() { world = new RAPIER.World({ x: 0, y: 0, z: 0 }); return new TrainingTargets(); }
function person(registry: TrainingTargets, z: number, enabled?: () => boolean) {
  const target = new LocalTrainingTarget();
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, z));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(avatar.bodyHalfHeight, avatar.bodyRadius).setTranslation(0, avatar.bodyY, 0).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget), body);
  registry.register(collider.handle, target, 'body', enabled);
  return target;
}
function box(z: number, material: BulletMaterial = 'wood') {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, z)); body.userData = { bulletMaterial: material };
  return world.createCollider(RAPIER.ColliderDesc.cuboid(1, 1, .2).setCollisionGroups(COLLISION_GROUPS.map), body);
}
function fire(registry: TrainingTargets, weapon: WeaponId, sequence = 1) {
  world.step();
  const aim = registry.aim(world, { origin, direction, range: WEAPON_CONFIGS[weapon].range })!;
  const result = queryMuzzleRay(world, origin, muzzle, aim, WEAPON_CONFIGS[weapon].range)!;
  return registry.resolveVolley(world, { tick: sequence * 80, sequence }, Array.from({ length: weapon === 'shotgun' ? 8 : 1 }, () => result), weapon);
}
test.each([
  { weapon: 'rifle' as const, expected: [20, 13, 8, 0, 0] },
  { weapon: 'sniper' as const, expected: [80, 68, 58, 49, 0] },
])('$weapon uses sorted real sensors for multi-person damage, stops at limit and deduplicates replay', ({ weapon, expected }) => {
  const registry = setup(), targets = [-3, -6, -9, -12, -15].map(z => person(registry, z));
  const resolved = fire(registry, weapon), last = weapon === 'rifle' ? -9 : -12;
  expect(targets.map(t => t.getSnapshot().lastDamage)).toEqual(expected);
  expect(resolved.pellets[0].point.z).toBeGreaterThan(last); expect(resolved.pellets[0].point.z).toBeLessThan(last + .4);
  expect(resolved.pellets[0].contacts).toHaveLength(weapon === 'rifle' ? 3 : 4);
  fire(registry, weapon); expect(targets.map(t => t.getSnapshot().lastDamage)).toEqual(expected);
  expect(targets[0].getSnapshot().hitCount).toBe(1);
});
test.each([
  { weapon: 'rifle' as const, first: 10, second: 0 },
  { weapon: 'sniper' as const, first: 60, second: 38 },
  { weapon: 'shotgun' as const, first: 32, second: 0 },
])('$weapon penetrates only tagged wood and composes box/body loss', ({ weapon, first, second }) => {
  const registry = setup(); box(-1); const a = person(registry, -2); box(-3); const b = person(registry, -4);
  fire(registry, weapon);
  expect(a.getSnapshot().lastDamage).toBe(first); expect(b.getSnapshot().lastDamage).toBe(second);
});
test('shotgun attenuates each pellet and sums once per victim, preserving lethal direct damage', () => {
  const registry = setup(), a = person(registry, -1.5), b = person(registry, -3), c = person(registry, -4.5);
  const receive = vi.spyOn(b, 'receiveHit'), result = fire(registry, 'shotgun');
  expect(a.getSnapshot().hp).toBe(0); expect(b.getSnapshot()).toMatchObject({ hp: 52, hitCount: 1, lastDamage: 48 }); expect(c.getSnapshot().hp).toBe(100);
  expect(receive).toHaveBeenCalledTimes(1); expect(b.damageNumbers.getSnapshot().map(n => n.damage)).toEqual([48]);
  expect(result.pellets).toHaveLength(8); expect(result.pellets.every(p => p.contacts?.length === 2)).toBe(true);
});
test('solid map still stops penetration, and wood does not bypass the anchor-to-muzzle safety segment', () => {
  const registry = setup(); box(-1); const a = person(registry, -2); box(-3, 'solid'); const b = person(registry, -4);
  const hit = fire(registry, 'sniper'); expect(a.getSnapshot().hp).toBe(40); expect(b.getSnapshot().hp).toBe(100);
  expect(hit.pellets[0].point.z).toBeCloseTo(-2.8, 5);
  box(-.05); const blocked = fire(registry, 'sniper', 2); expect(blocked.pellets).toEqual([]); expect(a.getSnapshot().hp).toBe(40);
});
test('disabled/unregistered sensors spend no penetration; rejected health damage still consumes passage', () => {
  const registry = setup(); let enabled = false; const a = person(registry, -1.5, () => enabled), b = person(registry, -3);
  fire(registry, 'rifle'); expect(a.getSnapshot().hp).toBe(100); expect(b.getSnapshot().hp).toBe(80);
  enabled = true; vi.spyOn(a, 'receiveHit').mockReturnValue(false);
  fire(registry, 'rifle', 2); expect(a.getSnapshot().hp).toBe(100); expect(b.getSnapshot().lastDamage).toBe(13);
  registry.dispose(); const before = b.getSnapshot(); fire(registry, 'rifle', 3); expect(b.getSnapshot()).toBe(before);
});
test('visuals continue beyond a first hit, flash at true contacts, and expire/clear without world object growth', () => {
  const registry = setup(); box(-1); person(registry, -3); const counts = [world.bodies.len(), world.colliders.len()];
  const feedback = new ShotFeedback(), result = fire(registry, 'sniper');
  feedback.emit({ sequence: 1, weapon: 'sniper', muzzle, impact: null, pellets: result.pellets });
  expect(result.pellets[0]).toMatchObject({ hit: false }); expect(result.pellets[0].point.z).toBeCloseTo(-100.1);
  expect(feedback.getPelletState().impacts).toHaveLength(2); expect(feedback.getPelletState().impacts[0].z).toBeCloseTo(-.8, 5);
  feedback.step(.15); expect(feedback.getPelletState().impacts).toEqual([]); feedback.clear(); expect(feedback.getPelletState().pellets).toEqual([]);
  expect([world.bodies.len(), world.colliders.len()]).toEqual(counts);
});
test('bubble still bursts on wood and cannot splash through its solid volume', () => {
  const registry = setup(); box(-1); const a = person(registry, -2), bubbles = new LocalBubbleFlight(registry); world.step();
  bubbles.flight.spawn(1, muzzle, direction); for (let i = 0; i < 15; i++) bubbles.step(world, i);
  expect(bubbles.flight.getSnapshot()).toEqual([]); expect(a.getSnapshot().hp).toBe(100);
});
test('material lives in map/spawn identities, only the two west crates are wooden arena cover', () => {
  setup();
  expect(ARENA_SOLIDS.filter(s => s.bulletMaterial === 'wood').map(s => s.id)).toEqual(['west-red-crate', 'west-blue-crate']);
  for (const [catalog, hash] of [[ARENA_COLLISION, ARENA_COLLISION_HASH], [WHITEBOX_COLLISION, WHITEBOX_COLLISION_HASH]] as const) {
    const changed = { ...catalog, solids: catalog.solids.map(s => ({ ...s, bulletMaterial: 'solid' })) };
    expect(whiteboxCollisionHash(changed)).not.toBe(hash);
  }
  expect(WHITEBOX_SPAWNS.collisionHash).toBe(WHITEBOX_COLLISION_HASH); expect(ARENA_SPAWNS.collisionHash).toBe(ARENA_COLLISION_HASH);
});
