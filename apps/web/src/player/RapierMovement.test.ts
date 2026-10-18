import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { weaponGroundSpeed, RIFLE_SPREAD_CONFIG, COLLISION_GROUPS, PHYSICS_CONFIG, PLAYER_CONFIG, WHITEBOX_CONFIG, type MovementKeys } from '@bubble-arena/shared';
import { RapierMovement } from './RapierMovement';
import { RifleMotion } from '../weapons/RifleMotion';
import { PlayerFacing } from './PlayerFacing';

const idle: MovementKeys = { forward: false, backward: false, left: false, right: false };

test('wall-slide displacement never changes view heading or rotates the capsule collider', () => {
  const player = setup(); const facing = new PlayerFacing();
  for (let tick = 0; tick < 120; tick++) {
    const result = adapter.step(player.body, player.collider, { ...idle, forward: true, right: true });
    if (!result) throw new Error('missing adapter');
    facing.step(0);
    world.step();
  }
  expect(facing.getYaw()).toBe(0);
  expect(player.body.rotation().y).toBe(0);
  expect(player.body.rotation().w).toBe(1);
});

test('real capsule uses camera yaw while retaining gravity and the existing speed', () => {
  const player = setup(false);
  const start = player.body.translation();
  for (let tick = 0; tick < 60; tick++) {
    adapter.step(player.body, player.collider, { ...idle, forward: true }, false, -Math.PI / 2);
    world.step();
  }
  const position = player.body.translation();
  expect(position.x - start.x).toBeGreaterThan(PLAYER_CONFIG.speed * .88);
  expect(position.x - start.x).toBeLessThan(PLAYER_CONFIG.speed);
  expect(Math.abs(position.z - start.z)).toBeLessThan(0.03);
  expect(position.y).toBeGreaterThanOrEqual(PLAYER_CONFIG.height / 2);
  expect(position.y).toBeLessThan(PLAYER_CONFIG.height / 2 + 0.03);
});
let world: RAPIER.World;
let adapter: RapierMovement;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => { adapter?.dispose(); world?.free(); });

function setup(withWall = true, tuning: ConstructorParameters<typeof RapierMovement>[1] = {}) {
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
  adapter = new RapierMovement(world, tuning);
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
  expect(moved.z).toBeLessThan(-PLAYER_CONFIG.speed * .88);
  expect(moved.z).toBeGreaterThan(-PLAYER_CONFIG.speed);
  expect(moved.y).toBeGreaterThanOrEqual(PLAYER_CONFIG.height / 2);
  expect(moved.y).toBeLessThan(PLAYER_CONFIG.height / 2 + 0.03);
  run(player, idle, 30);
  const stopped = player.body.translation();
  run(player, idle, 30);
  const final = player.body.translation();
  expect(Math.hypot(final.x - stopped.x, final.z - stopped.z)).toBeLessThan(0.001);
  // Float32 floor separation can settle by ~2mm after the horizontal velocity reaches zero.
  expect(Math.abs(final.y - stopped.y)).toBeLessThan(.003);
  expect(final.y).toBeCloseTo(PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.controllerOffset, 2);
});

test.each([
  ['forward', 'z', -1], ['backward', 'z', 1], ['left', 'x', -1], ['right', 'x', 1],
] as const)('%s intent moves on the expected world axis', (action, axis, sign) => {
  const player = setup(false);
  const start = player.body.translation();
  const moved = run(player, { ...idle, [action]: true }, 60);
  expect((moved[axis] - start[axis]) * sign).toBeGreaterThan(PLAYER_CONFIG.speed * .88);
  expect((moved[axis] - start[axis]) * sign).toBeLessThan(PLAYER_CONFIG.speed);
  const otherAxis = axis === 'x' ? 'z' : 'x';
  // Continuous gravity adds floating-point contact corrections on the large floor.
  // Map penetration remains separately constrained to 1mm by the full-map tests.
  expect(Math.abs(moved[otherAxis] - start[otherAxis])).toBeLessThan(0.03);
});

test('straight approach is arrested by the wall, with the whole capsule outside it', () => {
  const player = setup();
  const position = run(player, { ...idle, forward: true });
  const nearFace = WHITEBOX_CONFIG.movementTestWall.position[2] + WHITEBOX_CONFIG.movementTestWall.size[2] / 2;
  expect(position.z).toBeGreaterThanOrEqual(nearFace + PLAYER_CONFIG.radius - 0.001);
  expect(position.z).toBeLessThan(nearFace + PLAYER_CONFIG.radius + 0.03);
  // Same large-floor tangential float32 correction bound as the free-motion fixtures.
  expect(Math.abs(position.x + 2)).toBeLessThan(0.03);
});

test('diagonal approach keeps moving tangentially along the wall instead of sticking or tunneling', () => {
  const player = setup();
  const keys = { ...idle, forward: true, right: true };
  const atWall = run(player, keys, 60);
  const slid = run(player, keys, 40);
  expect(atWall.z).toBeGreaterThan(-2.41);
  expect(atWall.z).toBeLessThan(-2.35);
  // Use the same 1mm float32 collision tolerance as the full-map penetration checks.
  expect(Math.abs(slid.z - atWall.z)).toBeLessThan(.001);
  expect(slid.x - atWall.x).toBeGreaterThan(2);
  expect(slid.y).toBeGreaterThanOrEqual(PLAYER_CONFIG.height / 2);
  expect(slid.y).toBeLessThan(PLAYER_CONFIG.height / 2 + 0.03);
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

test.each([{ aiming: false, action: 'right' }, { aiming: false, action: 'backward' },
  { aiming: true, action: 'right' }, { aiming: true, action: 'backward' }] as const)(
  'ordinary/precise %j moves without turning', ({ aiming, action }) => {
  const player = setup(false), facing = new PlayerFacing();
  const start = player.body.translation(), yaw = 0.8;
  for (let tick = 0; tick < 60; tick++) {
    const result = adapter.step(player.body, player.collider, { ...idle, [action]: true, aiming }, false, yaw);
    if (!result) throw new Error('missing adapter');
    facing.step(yaw);
    world.step();
  }
  const end = player.body.translation(), dx = end.x - start.x, dz = end.z - start.z;
  const expectedX = action === 'right' ? Math.cos(yaw) : Math.sin(yaw);
  const expectedZ = action === 'right' ? -Math.sin(yaw) : Math.cos(yaw);
  expect(dx * expectedX + dz * expectedZ).toBeGreaterThan((aiming ? PLAYER_CONFIG.aimSpeed : PLAYER_CONFIG.speed) - 0.6);
  expect(dx * expectedX + dz * expectedZ).toBeLessThan(aiming ? PLAYER_CONFIG.aimSpeed : PLAYER_CONFIG.speed);
  expect(Math.abs(dx * expectedZ - dz * expectedX)).toBeLessThan(0.03);
  expect(facing.getYaw()).toBeCloseTo(yaw, 4);
  expect(player.body.rotation()).toEqual({ x: 0, y: 0, z: 0, w: 1 });
});

test.each([0, 0.35, 1])('air control %s changes only airborne steering, using same controller interface', airControl => {
  const player = setup(false, { airControl });
  player.body.setTranslation({ x: -2, y: 5, z: 0 }, true); world.step();
  const result = adapter.step(player.body, player.collider, { ...idle, right: true });
  if (!result) throw new Error('missing adapter');
  expect(result.grounded).toBe(false);
  expect(result.desired.x / PHYSICS_CONFIG.timeStep).toBeCloseTo(PLAYER_CONFIG.acceleration / 60 * airControl);
  expect(result.desired.y).toBeLessThan(0);
});

test('actual wall movement expands spread while pressing into a blocked wall stays stationary', () => {
  const player = setup(), motion = new RifleMotion();
  let moved = false;
  for (let i = 0; i < 180; i++) {
    const result = adapter.step(player.body, player.collider, { ...idle, forward: true });
    if (!result) throw new Error('missing movement');
    motion.setSpeed(Math.hypot(result.allowed.x, result.allowed.z) / PHYSICS_CONFIG.timeStep);
    moved ||= motion.getSnapshot() > RIFLE_SPREAD_CONFIG.normal;
    world.step();
  }
  expect(moved).toBe(true); expect(motion.getSnapshot()).toBeCloseTo(RIFLE_SPREAD_CONFIG.normal, 12);
});

test.each(['rifle', 'shotgun', 'sniper', 'bubble'] as const)('real capsule reaches %s weighted ground speed on a flat floor', id => {
  const player = setup(false);
  let result: ReturnType<RapierMovement['step']>;
  for (let tick = 0; tick < 90; tick++) {
    result = adapter.step(player.body, player.collider, { ...idle, backward: true }, false, 0, weaponGroundSpeed(id) / PLAYER_CONFIG.speed);
    world.step();
  }
  // Rapier float32 contact separation adds up to a few mm/s on this flat fixture.
  expect(Math.abs(Math.hypot(result!.allowed.x, result!.allowed.z) / PHYSICS_CONFIG.timeStep - weaponGroundSpeed(id))).toBeLessThan(.02);
  expect(result!.grounded).toBe(true);
});

test('real grounded capsule starts in four ticks, brakes under 11cm and reverses in eight ticks', () => {
  const player = setup(false);
  run(player, idle, 10);
  let result: NonNullable<ReturnType<RapierMovement['step']>>;
  const step = (keys: MovementKeys, jump = false) => {
    result = adapter.step(player.body, player.collider, keys, jump)!; world.step(); return result;
  };
  for (let i = 0; i < 4; i++) step({ ...idle, backward: true });
  expect(result!.allowed.z / PHYSICS_CONFIG.timeStep).toBeCloseTo(6, 2);
  const released = player.body.translation().z;
  for (let i = 0; i < 3; i++) step(idle);
  expect(Math.abs(result!.allowed.z)).toBeLessThan(.0001);
  expect(player.body.translation().z - released).toBeLessThan(.11);
  for (let i = 0; i < 4; i++) step({ ...idle, backward: true });
  for (let i = 0; i < 8; i++) step({ ...idle, forward: true });
  expect(result!.allowed.z / PHYSICS_CONFIG.timeStep).toBeCloseTo(-6, 2);
  const stopped = step(idle); expect(stopped.grounded).toBe(true);
});

test('real jump can reverse direction within thirteen airborne ticks without gaining speed or jumping twice', () => {
  const player = setup(false);
  run(player, idle, 10); run(player, { ...idle, backward: true }, 10);
  expect(adapter.step(player.body, player.collider, { ...idle, backward: true }, true)!.jumped).toBe(true); world.step();
  let result: NonNullable<ReturnType<RapierMovement['step']>>;
  for (let i = 0; i < 13; i++) {
    result = adapter.step(player.body, player.collider, { ...idle, forward: true }, true)!; world.step();
    expect(result.jumped).toBe(false);
    expect(result.grounded).toBe(false);
    expect(Math.hypot(result.allowed.x, result.allowed.z) / PHYSICS_CONFIG.timeStep).toBeLessThan(6.02);
  }
  expect(result!.allowed.z / PHYSICS_CONFIG.timeStep).toBeCloseTo(-6, 2);
});
