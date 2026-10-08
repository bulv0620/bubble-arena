import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, PHYSICS_CONFIG, PLAYER_CONFIG, WHITEBOX_COLLISION, type MovementKeys } from '@bubble-arena/shared';
import { KeyboardInput } from './KeyboardInput';
import { RapierMovement } from './RapierMovement';

const idle = { forward: false, backward: false, left: false, right: false };
let world: RAPIER.World;
let movement: RapierMovement;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => { movement?.dispose(); world?.free(); });

function setup(position: [number, number, number] = [-2, 0.92, 0]) {
  const [x, y, z] = PHYSICS_CONFIG.gravity;
  world = new RAPIER.World({ x, y, z });
  world.timestep = PHYSICS_CONFIG.timeStep;
  const ground = WHITEBOX_COLLISION.ground;
  world.createCollider(RAPIER.ColliderDesc.cuboid(ground.size / 2, ground.thickness / 2, ground.size / 2)
    .setTranslation(0, ground.topY - ground.thickness / 2, 0).setCollisionGroups(COLLISION_GROUPS.map));
  for (const solid of WHITEBOX_COLLISION.solids) {
    const [sx, sy, sz] = solid.size;
    const [px, py, pz] = solid.position;
    world.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2)
      .setRotation({ x: 0, y: 0, z: Math.sin(solid.rotationZ / 2), w: Math.cos(solid.rotationZ / 2) })
      .setTranslation(px, py, pz).setCollisionGroups(COLLISION_GROUPS.map));
  }
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...position));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius)
    .setCollisionGroups(COLLISION_GROUPS.player), body);
  movement = new RapierMovement(world);
  world.step();
  return { body, collider };
}

function tick(player: ReturnType<typeof setup>, jump = false, keys: MovementKeys = idle) {
  const result = movement.step(player.body, player.collider, keys, jump)!;
  world.step();
  return { ...result, position: player.body.translation() };
}

test.each([
  ['wall', { ...idle, forward: true }],
  ['corner', { ...idle, forward: true, left: true }],
] as const)('holding movement against a %s does not cancel upward jump velocity', (_name, keys) => {
  const player = setup();
  for (let i = 0; i < 120; i += 1) tick(player, false, keys);
  const start = player.body.translation().y;
  expect(tick(player, true, keys).jumped).toBe(true);
  let peak = start;
  for (let i = 0; i < 60; i += 1) {
    const result = tick(player, false, keys);
    peak = Math.max(peak, result.position.y);
    world.colliders.forEach(obstacle => {
      if (obstacle.handle === player.collider.handle) return;
      const contact = player.collider.contactCollider(obstacle, 0.03);
      if (contact) expect(contact.distance).toBeGreaterThanOrEqual(-0.001);
    });
  }
  expect(peak - start).toBeGreaterThan(1.1);
  expect(peak - start).toBeLessThan(1.3);
});

test('real Space tap launches, rises about 1.2m, falls and settles on the physical floor', () => {
  const player = setup();
  for (let i = 0; i < 10; i += 1) tick(player);
  const start = player.body.translation().y;
  const input = new KeyboardInput();
  const keys = new EventTarget();
  const visibility = Object.assign(new EventTarget(), { visibilityState: 'visible' as const });
  const detach = input.attach(keys, visibility);
  try {
    for (const type of ['keydown', 'keyup']) keys.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code: 'Space' }));
    expect(tick(player, input.consumeJump()).jumped).toBe(true);
    let peak = player.body.translation().y;
    let descended = false;
    for (let i = 0; i < 120; i += 1) {
      const result = tick(player, input.consumeJump());
      peak = Math.max(peak, result.position.y);
      if (result.velocityY < 0) descended = true;
      expect(result.position.y).toBeGreaterThanOrEqual(PLAYER_CONFIG.height / 2 - 0.001);
    }
    expect(peak - start).toBeGreaterThan(1.1); expect(peak - start).toBeLessThan(1.3);
    expect(descended).toBe(true);
    expect(player.body.translation().y).toBeCloseTo(start, 3);
    const settled = tick(player);
    expect(settled.velocityY).toBe(0); expect(settled.grounded).toBe(true);
  } finally {
    detach();
  }
});

test.each([
  ['ground', -2, 0, 0],
  ['small box', WHITEBOX_COLLISION.solids[2].position[0], WHITEBOX_COLLISION.solids[2].position[2], WHITEBOX_COLLISION.solids[2].size[1]],
] as const)('gravity drops the capsule from 6m onto %s without tunneling', (_name, x, z, surfaceY) => {
  const player = setup([x, 6, z]);
  for (let i = 0; i < 180; i += 1) {
    const result = tick(player);
    expect(result.position.y - PLAYER_CONFIG.height / 2).toBeGreaterThanOrEqual(surfaceY - 0.001);
  }
  const final = tick(player);
  expect(final.position.y - PLAYER_CONFIG.height / 2).toBeGreaterThanOrEqual(surfaceY);
  expect(final.position.y - PLAYER_CONFIG.height / 2).toBeLessThan(surfaceY + 0.03);
  expect(final.velocityY).toBe(0);
});

test('upward collision cancels velocity and gravity returns the player without ceiling penetration', () => {
  const player = setup();
  const ceilingBottom = 2.6;
  const ceiling = world.createCollider(RAPIER.ColliderDesc.cuboid(2, 0.25, 2)
    .setTranslation(-2, ceilingBottom + 0.25, 0).setCollisionGroups(COLLISION_GROUPS.map));
  world.step();
  for (let i = 0; i < 10; i += 1) tick(player);
  tick(player, true);
  let peak = player.body.translation().y;
  for (let i = 0; i < 120; i += 1) {
    const result = tick(player);
    peak = Math.max(peak, result.position.y);
    expect(result.position.y + PLAYER_CONFIG.height / 2).toBeLessThanOrEqual(ceilingBottom + 0.001);
    const contact = player.collider.contactCollider(ceiling, 0.03);
    if (contact) expect(contact.distance).toBeGreaterThanOrEqual(-0.001);
  }
  expect(peak + PLAYER_CONFIG.height / 2).toBeGreaterThan(ceilingBottom - 0.03);
  expect(tick(player).velocityY).toBe(0);
});

test('outside the finite map gravity continues falling, with no hard-coded floor height', () => {
  const player = setup([42, 5, 0]);
  for (let i = 0; i < 120; i += 1) tick(player);
  expect(player.body.translation().y).toBeLessThan(-10);
});

test('horizontal movement and a jump remain blocked by the shared wall while airborne', () => {
  const player = setup();
  for (let i = 0; i < 10; i += 1) tick(player);
  const forward = { ...idle, forward: true };
  for (let i = 0; i < 12; i += 1) tick(player, false, forward);
  expect(tick(player, true, forward).jumped).toBe(true);
  let airborneAtWall = false;
  for (let i = 0; i < 120; i += 1) {
    const result = tick(player, false, forward);
    expect(result.position.z).toBeGreaterThan(-2.41);
    if (result.position.z < -2.35 && result.position.y > 1.5) airborneAtWall = true;
  }
  expect(airborneAtWall).toBe(true);
  expect(player.body.translation().z).toBeLessThan(-2.35);
});

test('repeated airborne requests cannot restart a jump; landing restores eligibility', () => {
  const player = setup();
  for (let i = 0; i < 10; i += 1) tick(player);
  expect(tick(player, true).jumped).toBe(true);
  let landed = false;
  for (let i = 0; i < 100; i += 1) {
    const result = tick(player, true);
    expect(result.jumped).toBe(false);
    if (result.grounded) { landed = true; break; }
  }
  expect(landed).toBe(true);
  expect(tick(player, true).jumped).toBe(true);
});

test('removing the supporting box invalidates last tick grounding before jump input', () => {
  const player = setup([1.75, 2.42, 1.5]);
  for (let i = 0; i < 10; i += 1) tick(player);
  expect(tick(player).grounded).toBe(true);
  const box = [...world.colliders.getAll()].find(c => c.translation().x === 1.75 && c.translation().y === 0.75)!;
  world.removeCollider(box, false);
  world.step();
  const result = tick(player, true);
  expect(result.jumped).toBe(false);
  expect(result.grounded).toBe(false);
  expect(result.velocityY).toBeLessThan(0);
});

test('walking off a box cannot grant an airborne jump along its vertical side', () => {
  const player = setup([1.75, 2.42, 1.5]);
  for (let i = 0; i < 10; i += 1) tick(player);
  let leftSupport = false;
  for (let i = 0; i < 90; i += 1) {
    const result = tick(player, false, { ...idle, right: true });
    if (!result.grounded && result.position.y > 1.3) {
      leftSupport = true;
      expect(tick(player, true).jumped).toBe(false);
      break;
    }
  }
  expect(leftSupport).toBe(true);
});

test('wall and ceiling contact never restore an airborne jump', () => {
  const player = setup([-2, 1.7, -2.39]);
  world.createCollider(RAPIER.ColliderDesc.cuboid(2, 0.25, 2)
    .setTranslation(-2, 2.85, -2.39).setCollisionGroups(COLLISION_GROUPS.map));
  world.step();
  for (let i = 0; i < 8; i += 1) {
    const result = tick(player, true, { ...idle, forward: true });
    expect(result.jumped).toBe(false);
    expect(result.grounded).toBe(false);
  }
});

test.each(['dynamic', 'kinematic', 'sensor'] as const)('%s objects cannot supply jump support', kind => {
  const player = setup([-2, 4.42, 0]);
  const desc = RAPIER.ColliderDesc.cuboid(1, 0.5, 1).setCollisionGroups(COLLISION_GROUPS.map);
  if (kind === 'sensor') world.createCollider(desc.setTranslation(-2, 3, 0).setSensor(true));
  else {
    const bodyDesc = kind === 'dynamic' ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.kinematicPositionBased();
    const support = world.createRigidBody(bodyDesc.setTranslation(-2, 3, 0));
    if (kind === 'dynamic') support.setGravityScale(0, false);
    world.createCollider(desc, support);
  }
  world.step();
  expect(tick(player, true).jumped).toBe(false);
  expect(tick(player, true).grounded).toBe(false);
});

test('holding Space across landing does not auto-jump; releasing and pressing again does', () => {
  const player = setup();
  for (let i = 0; i < 10; i += 1) tick(player);
  const input = new KeyboardInput();
  const keys = new EventTarget();
  const detach = input.attach(keys, Object.assign(new EventTarget(), { visibilityState: 'visible' as const }));
  const send = (type: string, repeat = false) => keys.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code: 'Space', repeat }));
  try {
    send('keydown');
    expect(tick(player, input.consumeJump()).jumped).toBe(true);
    for (let i = 0; i < 120; i += 1) {
      send('keydown', true);
      expect(tick(player, input.consumeJump()).jumped).toBe(false);
    }
    expect(tick(player).grounded).toBe(true);
    send('keyup'); send('keydown');
    expect(tick(player, input.consumeJump()).jumped).toBe(true);
  } finally { detach(); }
});
