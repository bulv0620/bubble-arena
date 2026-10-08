import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, PHYSICS_CONFIG, PLAYER_CONFIG, type MovementKeys } from '@bubble-arena/shared';
import { RapierMovement } from './RapierMovement';

const idle: MovementKeys = { forward: false, backward: false, left: false, right: false };
let world: RAPIER.World;
let movement: RapierMovement;
let obstacles: RAPIER.Collider[];
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => { movement?.dispose(); world?.free(); });

function setup(height: number, slopeDegrees = 0) {
  world = new RAPIER.World({ x: 0, y: PHYSICS_CONFIG.gravity[1], z: 0 });
  world.timestep = PHYSICS_CONFIG.timeStep;
  obstacles = [world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.5, 20).setTranslation(0, -0.5, 0).setCollisionGroups(COLLISION_GROUPS.map))];
  const angle = slopeDegrees * Math.PI / 180;
  const length = slopeDegrees ? 6 : 3;
  const thickness = slopeDegrees ? 0.2 : height;
  const obstacle = world.createCollider(RAPIER.ColliderDesc.cuboid(length / 2, thickness / 2, 1)
    .setTranslation(length * Math.cos(angle) / 2, slopeDegrees ? length * Math.sin(angle) / 2 - thickness * Math.cos(angle) / 2 : height / 2, 0)
    .setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }).setCollisionGroups(COLLISION_GROUPS.map));
  obstacles.push(obstacle);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1, 0.92, 0));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius).setCollisionGroups(COLLISION_GROUPS.player), body);
  movement = new RapierMovement(world);
  world.step();
  const player = { body, collider };
  for (let i = 0; i < 10; i += 1) tick(player);
  return player;
}

function tick(player: ReturnType<typeof setup>, keys = idle, jump = false) {
  const result = movement.step(player.body, player.collider, keys, jump)!;
  world.step();
  for (const obstacle of obstacles) {
    const contact = player.collider.contactCollider(obstacle, 0.03);
    if (contact) expect(contact.distance).toBeGreaterThanOrEqual(-0.001);
  }
  return { ...result, position: player.body.translation() };
}

test.each([0.15, 0.29, 0.3])('walks onto a %sm step without a jump and remains supported', height => {
  const player = setup(height);
  for (let i = 0; i < 35; i += 1) expect(tick(player, { ...idle, right: true }).jumped).toBe(false);
  expect(player.body.translation().x).toBeGreaterThan(0.5);
  expect(player.body.translation().y).toBeCloseTo(0.91 + height, 2);
  for (let i = 0; i < 20; i += 1) tick(player);
  expect(tick(player).grounded).toBe(true);
  expect(tick(player, idle, true).jumped).toBe(true);
});

test('a 0.4m step is blocked instead of climbing beyond the configured height', () => {
  const player = setup(0.4);
  for (let i = 0; i < 90; i += 1) tick(player, { ...idle, right: true });
  expect(player.body.translation().x).toBeLessThan(0);
  expect(player.body.translation().y).toBeLessThan(1.05);
});

test.each([30, 45])('climbs and descends a %s degree slope without jumping or penetrating it', angle => {
  const player = setup(0, angle);
  for (let i = 0; i < 65; i += 1) tick(player, { ...idle, right: true });
  const high = player.body.translation();
  expect(high.x).toBeGreaterThan(1.2);
  expect(high.y).toBeGreaterThan(1.8);
  for (let i = 0; i < 25; i += 1) tick(player);
  expect(Math.abs(player.body.translation().x - high.x)).toBeLessThan(0.5);
  expect(tick(player).grounded).toBe(true);
  let unsupported = 0;
  for (let i = 0; i < 90; i += 1) {
    const result = tick(player, { ...idle, left: true });
    if (result.position.x > 0.3 && !result.grounded) unsupported += 1;
  }
  expect(unsupported).toBeLessThanOrEqual(1);
  expect(player.body.translation().x).toBeLessThan(-0.5);
  expect(player.body.translation().y).toBeCloseTo(0.91, 2);
});

test.each([45.1, 55])('a %s degree slope cannot be climbed by continuous horizontal input', angle => {
  const player = setup(0, angle);
  for (let i = 0; i < 120; i += 1) tick(player, { ...idle, right: true });
  expect(player.body.translation().x).toBeLessThan(0.3);
  expect(player.body.translation().y).toBeLessThan(1.5);
});

test('jumping from a slope detaches immediately and cannot be restarted in the air', () => {
  const player = setup(0, 30);
  for (let i = 0; i < 50; i += 1) tick(player, { ...idle, right: true });
  for (let i = 0; i < 20; i += 1) tick(player);
  const start = player.body.translation().y;
  const launch = tick(player, idle, true);
  expect(launch.jumped).toBe(true);
  expect(launch.grounded).toBe(false);
  for (let i = 0; i < 12; i += 1) expect(tick(player, idle, true).jumped).toBe(false);
  expect(player.body.translation().y).toBeGreaterThan(start + 0.8);
});

test('autostep refuses a platform when the ceiling leaves insufficient headroom', () => {
  const player = setup(0.3);
  obstacles.push(world.createCollider(RAPIER.ColliderDesc.cuboid(2, 0.2, 1)
    .setTranslation(1, 2.25, 0).setCollisionGroups(COLLISION_GROUPS.map)));
  world.step();
  for (let i = 0; i < 90; i += 1) tick(player, { ...idle, right: true });
  expect(player.body.translation().x).toBeLessThan(0.5);
  expect(player.body.translation().y + PLAYER_CONFIG.height / 2).toBeLessThanOrEqual(2.051);
});
