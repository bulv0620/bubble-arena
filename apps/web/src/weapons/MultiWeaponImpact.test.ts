import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PlayerHealthState } from '@bubble-arena/game-core';
import { BLOCK_AVATAR_CONFIG as shape, COLLISION_GROUPS } from '@bubble-arena/shared';
import { TrainingTargets } from './TrainingTargets';
import { LocalTrainingTarget } from './LocalTrainingTarget';
import { LocalBubbleFlight } from './LocalBubbleFlight';
import { queryMuzzleRay } from './muzzleRay';
beforeAll(async () => { await RAPIER.init(); });
function dummy(world: RAPIER.World, registry: TrainingTargets, x = 0, z = -3) {
  const target = new LocalTrainingTarget();
  const head = world.createCollider(RAPIER.ColliderDesc.ball(shape.headRadius).setTranslation(x, 1 + shape.headY, z)
    .setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
  const body = world.createCollider(RAPIER.ColliderDesc.capsule(shape.bodyHalfHeight, shape.bodyRadius).setTranslation(x, 1 + shape.bodyY, z)
    .setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
  const releases = [registry.register(head.handle, target, 'head'), registry.register(body.handle, target, 'body')];
  return { target, release: () => releases.forEach(fn => fn()) };
}
function ray(world: RAPIER.World, registry: TrainingTargets, region: 'head' | 'body', range = 25, x = 0) {
  const origin = { x, y: 1 + (region === 'head' ? shape.headY : shape.bodyY), z: 0 };
  const aim = registry.aim(world, { origin, direction: { x: 0, y: 0, z: -1 }, range })!;
  return queryMuzzleRay(world, origin, { ...origin, z: -.7 }, aim, range)!;
}
test('eight real shotgun rays aggregate mixed head/body pellets into one HP event and one damage float', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry); world.step();
    const body = ray(world, registry, 'body'), head = ray(world, registry, 'head');
    const pellets = [head, head, ...Array.from({ length: 6 }, () => body)];
    const shot = { tick: 0, sequence: 1 };
    expect(registry.receiveVolley(world, shot, pellets, 'shotgun')).not.toBeNull();
    expect(entry.target.getSnapshot()).toMatchObject({ hp: 0, lastDamage: 100, hitCount: 1 });
    expect(entry.target.damageNumbers.getSnapshot().map(n => n.damage)).toEqual([100]);
    expect(registry.receiveVolley(world, shot, pellets, 'shotgun')).toBeNull();
    expect(entry.target.getSnapshot().hp).toBe(0);
  } finally { world.free(); }
});
test('close full body volley kills but one missing pellet leaves two HP; visual paths continue past sensors with contact flashes', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), full = dummy(world, registry, -1), partial = dummy(world, registry, 1); world.step();
    const body = ray(world, registry, 'body', 25, -1), partialBody = ray(world, registry, 'body', 25, 1);
    const resolved = registry.resolveVolley(world, { tick: 0, sequence: 1 }, Array.from({ length: 8 }, () => body), 'shotgun');
    expect(full.target.getSnapshot()).toMatchObject({ hp: 0, lastDamage: 100, hitCount: 1 });
    expect(resolved.pellets).toHaveLength(8); expect(resolved.pellets.every(p => !p.hit && p.point.z < -25 && p.contacts?.length === 1 && p.contacts[0].z > -3)).toBe(true);
    registry.receiveVolley(world, { tick: 60, sequence: 2 }, [...Array.from({ length: 7 }, () => partialBody), null], 'shotgun');
    expect(partial.target.getSnapshot()).toMatchObject({ hp: 2, lastDamage: 98 });
    expect(registry.resolveVolley(world, { tick: 60, sequence: 2 }, Array.from({ length: 8 }, () => body), 'shotgun').pellets).toEqual([]);
  } finally { world.free(); }
});
test('shotgun can hit two targets but each target receives only its own summed damage', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), left = dummy(world, registry, -1), right = dummy(world, registry, 1); world.step();
    registry.receiveVolley(world, { tick: 0, sequence: 1 }, [...Array.from({ length: 4 }, () => ray(world, registry, 'body', 25, -1)),
      ...Array.from({ length: 4 }, () => ray(world, registry, 'body', 25, 1))], 'shotgun');
    for (const entry of [left, right]) expect(entry.target.getSnapshot()).toMatchObject({ hp: 44, hitCount: 1, lastDamage: 56 });
  } finally { world.free(); }
});
test.each([-3, -96])('sniper head at z=%s clears full HP with no falloff, body remains 80', z => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), headTarget = dummy(world, registry, -1, z), bodyTarget = dummy(world, registry, 1, z); world.step();
    registry.receiveShotImpact(world, { tick: 0, sequence: 1 }, ray(world, registry, 'head', 100, -1), 'sniper');
    registry.receiveShotImpact(world, { tick: 75, sequence: 2 }, ray(world, registry, 'body', 100, 1), 'sniper');
    expect(headTarget.target.getSnapshot()).toMatchObject({ hp: 0, lastDamage: 100 });
    expect(bodyTarget.target.getSnapshot()).toMatchObject({ hp: 20, lastDamage: 80 });
  } finally { world.free(); }
});
test('sniper and shotgun cannot damage through map occlusion or beyond configured range', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), far = dummy(world, registry, 0, -102); world.step();
    expect(registry.receiveShotImpact(world, { tick: 0, sequence: 1 }, ray(world, registry, 'head', 100), 'sniper')).toBeNull();
    const near = dummy(world, registry, 0, -3);
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, .01).setTranslation(0, 1, -1).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    const body = ray(world, registry, 'body');
    expect(registry.receiveVolley(world, { tick: 1, sequence: 2 }, Array.from({ length: 8 }, () => body), 'shotgun')).toBeNull();
    expect(far.target.getSnapshot().hp).toBe(100); expect(near.target.getSnapshot().hp).toBe(100);
  } finally { world.free(); }
});
test('real swept bubble impact damages/slow-refreshes visible neighbours once, excluding targets behind a thin wall', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), near = dummy(world, registry, 0, -5), neighbour = dummy(world, registry, .9, -5), hidden = dummy(world, registry, 0, -6.3);
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, .01).setTranslation(0, 1, -5.7).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    const counts = [world.bodies.len(), world.colliders.len()], bubbles = new LocalBubbleFlight(registry);
    bubbles.flight.spawn(1, { x: 0, y: 1 + shape.headY, z: 0 }, { x: 0, y: 0, z: -1 });
    for (let tick = 0; tick < 20; tick++) bubbles.step(world, tick);
    for (const entry of [near, neighbour]) {
      expect(entry.target.getSnapshot()).toMatchObject({ hp: 75, hitCount: 1, lastDamage: 25 });
      expect(entry.target.getSlowSnapshot()).toBe(.5); expect(entry.target.damageNumbers.getSnapshot()).toHaveLength(1);
    }
    expect(hidden.target.getSnapshot().hp).toBe(100); expect(bubbles.flight.getSnapshot()).toEqual([]);
    expect([world.bodies.len(), world.colliders.len()]).toEqual(counts);
    expect(registry.receiveExplosion(world, { tick: 30, sequence: 1 }, { x: 0, y: 1.55, z: -4.5 })).toBe(0);
    for (let tick = 0; tick < 120; tick++) near.target.step(); expect(near.target.getSlowSnapshot()).toBe(1);
    bubbles.clear(); expect(bubbles.getExplosion()).toBeNull();
  } finally { world.free(); }
});
test('bubble fired before a later rifle hit still resolves on arrival, with a fresh damage-number identity', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry, 0, -5), bubbles = new LocalBubbleFlight(registry); world.step();
    bubbles.flight.spawn(1, { x: 0, y: 1.55, z: 0 }, { x: 0, y: 0, z: -1 });
    registry.receiveShotImpact(world, { tick: 1, sequence: 2 }, ray(world, registry, 'body', 70));
    expect(entry.target.getSnapshot().hp).toBe(80);
    for (let tick = 2; tick < 22; tick++) bubbles.step(world, tick);
    expect(entry.target.getSnapshot()).toMatchObject({ hp: 55, hitCount: 2 });
    expect(entry.target.damageNumbers.getSnapshot().map(n => n.damage)).toEqual([20, 25]);
  } finally { world.free(); }
});
test('unregistered target sensors do not explode a travelling bubble', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry, 0, -3), bubbles = new LocalBubbleFlight(registry); world.step(); entry.release();
    bubbles.flight.spawn(1, { x: 0, y: 1.55, z: 0 }, { x: 0, y: 0, z: -1 });
    for (let tick = 0; tick < 20; tick++) bubbles.step(world, tick);
    expect(bubbles.flight.getSnapshot()).toHaveLength(1); expect(entry.target.getSnapshot().hp).toBe(100);
  } finally { world.free(); }
});

test('already-flying bubble cannot slow while its rescued source is protected; actual accepted fire restores control', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry), source = new PlayerHealthState(); world.step();
    source.receiveDamage({ lifeId: 1, tick: 0, sequence: 1 }, 100, false);
    source.completeRescue({ lifeId: 1, revision: 1, elapsedTicks: 180 }, 180, false);
    let tick = 180;
    const flight = new LocalBubbleFlight(registry, () => source.canCauseControl(tick, false));
    const origin = { x: 0, y: 1 + shape.bodyY, z: 0 }, direction = { x: 0, y: 0, z: -1 };
    flight.flight.spawn(1, origin, direction);
    for (; tick < 200; tick++) flight.step(world, tick);
    expect(entry.target.getSnapshot().hp).toBe(75); expect(entry.target.getSlowSnapshot()).toBe(1);
    source.onAcceptedFire({ lifeId: 1, revision: 2, tick, sequence: 1 }, false);
    flight.flight.spawn(2, origin, direction);
    for (; tick < 220; tick++) flight.step(world, tick);
    expect(entry.target.getSnapshot().hp).toBe(50); expect(entry.target.getSlowSnapshot()).toBe(.5);
    entry.release(); flight.clear();
  } finally { world.free(); }
});
