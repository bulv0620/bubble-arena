import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, WHITEBOX_COLLISION, WHITEBOX_COLLISION_HASH, type RescuePosition, type RescueEligibilityFacts } from '@bubble-arena/shared';
import { evaluateRescueEligibility } from '@bubble-arena/game-core';
import { isRescueLineClear } from './rescueLineOfSight';
let world: RAPIER.World;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => { world?.free(); });
function setup() {
  world = new RAPIER.World({ x: 0, y: -20, z: 0 });
  const ground = WHITEBOX_COLLISION.ground;
  world.createCollider(RAPIER.ColliderDesc.cuboid(ground.size / 2, ground.thickness / 2, ground.size / 2)
    .setTranslation(0, ground.topY - ground.thickness / 2, 0).setCollisionGroups(COLLISION_GROUPS.map));
  for (const solid of WHITEBOX_COLLISION.solids) {
    const [sx, sy, sz] = solid.size, [x, y, z] = solid.position;
    world.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2).setTranslation(x, y, z)
      .setRotation({ x: 0, y: 0, z: Math.sin(solid.rotationZ / 2), w: Math.cos(solid.rotationZ / 2) }).setCollisionGroups(COLLISION_GROUPS.map));
  }
  world.step();
}
function check(from: RescuePosition, to: RescuePosition) {
  const facts: RescueEligibilityFacts = { rescuer: { playerId: 'a', teamId: 'red', life: { status: 'normal', lifeId: 1, revision: 0 }, position: from, grounded: true, connected: true },
    target: { playerId: 'b', teamId: 'red', life: { status: 'downed', lifeId: 1, revision: 1 }, position: to, grounded: false, connected: true }, targetRescuerId: null, matchFinished: false };
  return evaluateRescueEligibility('b', facts, (origin, end) => isRescueLineClear(world, origin, end));
}
test('actual shared-map wall denies even a 2m teammate; same side and moved-around edge allow rescue', () => {
  setup(); expect(WHITEBOX_COLLISION_HASH).toBe('fnv1a64:eec4606e04cf6656');
  expect(check({ x: 1, y: .9, z: -2 }, { x: 1, y: .9, z: -4 })).toEqual({ eligible: false, reason: 'blocked' });
  expect(check({ x: 1, y: .9, z: -2 }, { x: 2, y: .9, z: -2 }).eligible).toBe(true);
  expect(check({ x: 5.5, y: .9, z: -2 }, { x: 5.5, y: .9, z: -4 }).eligible).toBe(true);
  expect(check({ x: 1, y: .9, z: -4 }, { x: 1, y: .9, z: -2 })).toEqual({ eligible: false, reason: 'blocked' });
});
test('kinematic player bodies, dynamic cubes and sensors never occlude or allocate new world objects', () => {
  setup();
  const kinematic = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(1, .9, -2));
  world.createCollider(RAPIER.ColliderDesc.capsule(.55, .35).setCollisionGroups(COLLISION_GROUPS.player), kinematic);
  const dynamic = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1, .9, -2));
  world.createCollider(RAPIER.ColliderDesc.cuboid(.1, .1, .1).setCollisionGroups(COLLISION_GROUPS.map), dynamic);
  world.createCollider(RAPIER.ColliderDesc.ball(.5).setTranslation(1, .9, -2).setSensor(true).setCollisionGroups(COLLISION_GROUPS.map));
  world.createCollider(RAPIER.ColliderDesc.ball(.5).setTranslation(1, .9, -2).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
  world.step(); const bodies = world.bodies.len(), colliders = world.colliders.len();
  for (let tick = 0; tick < 60; tick++) expect(check({ x: 0, y: .9, z: -2 }, { x: 2, y: .9, z: -2 }).eligible).toBe(true);
  expect(world.bodies.len()).toBe(bodies); expect(world.colliders.len()).toBe(colliders);
});
test('solid origin/target and overlapping centres inside map fail closed; overlapping centres in clear space work', () => {
  setup(); const wall = { x: 1, y: .9, z: -3 }, clear = { x: 1, y: .9, z: -2 };
  expect(check(wall, clear)).toEqual({ eligible: false, reason: 'blocked' });
  expect(check(clear, wall)).toEqual({ eligible: false, reason: 'blocked' });
  expect(check(wall, wall)).toEqual({ eligible: false, reason: 'blocked' });
  expect(check(clear, clear).eligible).toBe(true);
});
test('invalid/overflow geometry never produces a clear result and exceptions leave world unchanged', () => {
  setup(); const bodies = world.bodies.len(), colliders = world.colliders.len(), point = { x: 0, y: .9, z: 0 };
  expect(() => isRescueLineClear(world, { ...point, x: NaN }, point)).toThrow(RangeError);
  expect(() => isRescueLineClear(world, point, { ...point, z: Infinity })).toThrow(RangeError);
  expect(isRescueLineClear(world, { ...point, x: -Number.MAX_VALUE }, { ...point, x: Number.MAX_VALUE })).toBe(false);
  expect(world.bodies.len()).toBe(bodies); expect(world.colliders.len()).toBe(colliders);
});
