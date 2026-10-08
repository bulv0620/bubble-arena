import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, PHYSICS_CONFIG, PLAYER_CONFIG, WHITEBOX_CONFIG, type MovementKeys } from '@bubble-arena/shared';
import { RapierMovement } from './RapierMovement';

const idle: MovementKeys = { forward: false, backward: false, left: false, right: false };
let world: RAPIER.World;
let adapter: RapierMovement;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => { adapter?.dispose(); world?.free(); });

function setup(withWall = true) {
  const [x, y, z] = PHYSICS_CONFIG.gravity;
  world = new RAPIER.World({ x, y, z });
  world.timestep = PHYSICS_CONFIG.timeStep;
  const { groundSize, groundThickness, groundTopY, playerSpawnXZ, movementTestWall } = WHITEBOX_CONFIG;
  world.createCollider(RAPIER.ColliderDesc.cuboid(groundSize / 2, groundThickness / 2, groundSize / 2)
    .setTranslation(0, groundTopY - groundThickness / 2, 0).setCollisionGroups(COLLISION_GROUPS.map));
  if (withWall) {
    const [sx, sy, sz] = movementTestWall.size;
    const [px, py, pz] = movementTestWall.position;
    world.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2)
      .setTranslation(px, py, pz).setCollisionGroups(COLLISION_GROUPS.map));
  }
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(playerSpawnXZ[0], groundTopY + PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance, playerSpawnXZ[1]));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius)
    .setCollisionGroups(COLLISION_GROUPS.player), body);
  adapter = new RapierMovement(world);
  world.step(); // Populate broad phase, as the live world does before the first input.
  return { body, collider };
}

function run(player: ReturnType<typeof setup>, keys: MovementKeys, steps = 120) {
  for (let tick = 0; tick < steps; tick += 1) {
    adapter.step(player.body, player.collider, keys);
    world.step();
  }
  return player.body.translation();
}

test('real controller allows free movement and decelerates after release', () => {
  const player = setup(false);
  const moved = run(player, { ...idle, forward: true }, 60);
  expect(moved.z).toBeLessThan(-4.4);
  expect(moved.z).toBeGreaterThan(-5);
  expect(moved.y).toBeCloseTo(PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance, 5);
  run(player, idle, 30);
  const stopped = player.body.translation();
  run(player, idle, 30);
  expect(player.body.translation()).toEqual(stopped);
});

test.each([
  ['forward', 'z', -1], ['backward', 'z', 1], ['left', 'x', -1], ['right', 'x', 1],
] as const)('%s intent moves on the expected world axis', (action, axis, sign) => {
  const player = setup(false);
  const start = player.body.translation();
  const moved = run(player, { ...idle, [action]: true }, 60);
  expect((moved[axis] - start[axis]) * sign).toBeGreaterThan(4.4);
  expect((moved[axis] - start[axis]) * sign).toBeLessThan(5);
  const otherAxis = axis === 'x' ? 'z' : 'x';
  expect(moved[otherAxis]).toBeCloseTo(start[otherAxis], 4);
});

test('straight approach is arrested by the wall, with the whole capsule outside it', () => {
  const player = setup();
  const position = run(player, { ...idle, forward: true });
  const nearFace = WHITEBOX_CONFIG.movementTestWall.position[2] + WHITEBOX_CONFIG.movementTestWall.size[2] / 2;
  expect(position.z).toBeGreaterThanOrEqual(nearFace + PLAYER_CONFIG.radius - 0.001);
  expect(position.z).toBeLessThan(nearFace + PLAYER_CONFIG.radius + 0.03);
  expect(Math.abs(position.x + 2)).toBeLessThan(0.002);
});

test('diagonal approach keeps moving tangentially along the wall instead of sticking or tunneling', () => {
  const player = setup();
  const keys = { ...idle, forward: true, right: true };
  const atWall = run(player, keys, 70);
  const slid = run(player, keys, 40);
  expect(atWall.z).toBeGreaterThan(-2.41);
  expect(atWall.z).toBeLessThan(-2.35);
  expect(slid.z).toBeCloseTo(atWall.z, 3);
  expect(slid.x - atWall.x).toBeGreaterThan(2);
  expect(slid.y).toBeCloseTo(PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance, 5);
});

test('dynamic cubes, other players and static sensors do not block or push the player', () => {
  const player = setup(false);
  const cube = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(-2, 0.5, -1.5));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setCollisionGroups(COLLISION_GROUPS.testCube), cube);
  const other = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-2, 0.9, -2.5));
  world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.35).setCollisionGroups(COLLISION_GROUPS.player), other);
  world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.2).setTranslation(-2, 1, -3.5)
    .setCollisionGroups(COLLISION_GROUPS.map).setSensor(true));
  world.step();
  expect(run(player, { ...idle, forward: true }, 60).z).toBeLessThan(-4.4);
  expect(cube.translation().z).toBeCloseTo(-1.5, 4);
  expect(other.translation().z).toBeCloseTo(-2.5, 4);
});

test('controller disposal is idempotent and a disposed adapter cannot move a body', () => {
  const player = setup();
  expect(world.characterControllers.size).toBe(1);
  adapter.dispose(); adapter.dispose();
  expect(world.characterControllers.size).toBe(0);
  const start = player.body.translation();
  expect(adapter.step(player.body, player.collider, { ...idle, forward: true })).toBeUndefined();
  world.step();
  expect(player.body.translation()).toEqual(start);
});
