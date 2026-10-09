import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
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
    expect(entry.target.getSnapshot()).toMatchObject({ hp: 28, lastDamage: 72, hitCount: 1 });
    expect(entry.target.damageNumbers.getSnapshot().map(n => n.damage)).toEqual([72]);
    expect(registry.receiveVolley(world, shot, pellets, 'shotgun')).toBeNull();
    expect(entry.target.getSnapshot().hp).toBe(28);
  } finally { world.free(); }
});
test('shotgun can hit two targets but each target receives only its own summed damage', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), left = dummy(world, registry, -1), right = dummy(world, registry, 1); world.step();
    registry.receiveVolley(world, { tick: 0, sequence: 1 }, [...Array.from({ length: 4 }, () => ray(world, registry, 'body', 25, -1)),
      ...Array.from({ length: 4 }, () => ray(world, registry, 'body', 25, 1))], 'shotgun');
    for (const entry of [left, right]) expect(entry.target.getSnapshot()).toMatchObject({ hp: 68, hitCount: 1, lastDamage: 32 });
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
