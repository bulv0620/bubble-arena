import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, PHYSICS_CONFIG, PLAYER_CONFIG, WHITEBOX_COLLISION, WHITEBOX_SOLIDS, type MovementKeys } from '@bubble-arena/shared';
import { RapierMovement } from '../player/RapierMovement';

const idle: MovementKeys = { forward: false, backward: false, left: false, right: false };
const boxes = WHITEBOX_SOLIDS.filter((solid) => solid.kind === 'box');
const approaches = boxes.flatMap((box) => (['x', 'z'] as const).flatMap((axis) =>
  ([-1, 1] as const).map((side) => ({ box, axis, side })),
));
let world: RAPIER.World;
let adapter: RapierMovement;
let mapColliders: RAPIER.Collider[];
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => { adapter?.dispose(); world?.free(); });

function setup(x: number, z: number, omitId?: string, y = PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance) {
  const [gx, gy, gz] = PHYSICS_CONFIG.gravity;
  world = new RAPIER.World({ x: gx, y: gy, z: gz });
  world.timestep = PHYSICS_CONFIG.timeStep;
  const ground = WHITEBOX_COLLISION.ground;
  mapColliders = [world.createCollider(RAPIER.ColliderDesc.cuboid(ground.size / 2, ground.thickness / 2, ground.size / 2)
    .setTranslation(0, ground.topY - ground.thickness / 2, 0).setCollisionGroups(COLLISION_GROUPS.map))];
  for (const solid of WHITEBOX_COLLISION.solids) {
    if (solid.id === omitId) continue;
    const [sx, sy, sz] = solid.size;
    const [px, py, pz] = solid.position;
    mapColliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2)
      .setRotation({ x: 0, y: 0, z: Math.sin(solid.rotationZ / 2), w: Math.cos(solid.rotationZ / 2) })
      .setTranslation(px, py, pz).setCollisionGroups(COLLISION_GROUPS.map)));
  }
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius)
    .setCollisionGroups(COLLISION_GROUPS.player), body);
  adapter = new RapierMovement(world);
  world.step();
  return { body, collider };
}

function run(player: ReturnType<typeof setup>, keys: MovementKeys, ticks = 120) {
  for (let tick = 0; tick < ticks; tick += 1) {
    adapter.step(player.body, player.collider, keys);
    world.step();
    for (const obstacle of mapColliders) {
      const contact = player.collider.contactCollider(obstacle, 0.03);
      if (contact) expect(contact.distance).toBeGreaterThanOrEqual(-0.001);
    }
  }
  return player.body.translation();
}

test.each(approaches)('$box.id blocks approach on $axis side $side without any step penetrating the map', ({ box, axis, side }) => {
  const axisIndex = axis === 'x' ? 0 : 2;
  const start = [...box.position];
  start[axisIndex] += side * (box.size[axisIndex] / 2 + 2);
  const player = setup(start[0], start[2]);
  const action = axis === 'x' ? (side === 1 ? 'left' : 'right') : (side === 1 ? 'forward' : 'backward');
  const final = run(player, { ...idle, [action]: true });
  const distance = (final[axis] - box.position[axisIndex]) * side;
  expect(distance).toBeGreaterThanOrEqual(box.size[axisIndex] / 2 + PLAYER_CONFIG.radius - 0.001);
  expect(distance).toBeLessThan(box.size[axisIndex] / 2 + PLAYER_CONFIG.radius + 0.03);
});

test.each(boxes)('removing $id collision lets the same approach cross its occupied region', (box) => {
  const player = setup(box.position[0] - box.size[0] / 2 - 2, box.position[2], box.id);
  expect(run(player, { ...idle, right: true }, 60).x).toBeGreaterThan(box.position[0]);
});

test('joined wall corner arrests both axes and reversing input releases the player', () => {
  const player = setup(-2, 0);
  const blocked = run(player, { ...idle, forward: true, left: true }, 180);
  expect(blocked.x).toBeGreaterThan(-2.66); expect(blocked.x).toBeLessThan(-2.6);
  expect(blocked.z).toBeGreaterThan(-2.41); expect(blocked.z).toBeLessThan(-2.35);
  const escaped = run(player, { ...idle, backward: true, right: true }, 60);
  expect(escaped.x - blocked.x).toBeGreaterThan(1);
  expect(escaped.z - blocked.z).toBeGreaterThan(1);
});

test('player can slide away from a box face and route around it without invisible blockers', () => {
  const box = boxes[0];
  const player = setup(box.position[0] - box.size[0] / 2 - 2, box.position[2]);
  run(player, { ...idle, right: true });
  const north = run(player, { ...idle, forward: true }, 40);
  expect(north.z).toBeLessThan(box.position[2] - box.size[2] / 2 - PLAYER_CONFIG.radius);
  const past = run(player, { ...idle, right: true }, 60);
  expect(past.x).toBeGreaterThan(box.position[0] + box.size[0] / 2 + PLAYER_CONFIG.radius);
});

test('real capsule sweep is blocked by the physical ground during a downward query', () => {
  const player = setup(-2, 0, undefined, 4);
  const controller = world.createCharacterController(PLAYER_CONFIG.controllerOffset);
  try {
    controller.computeColliderMovement(player.collider, { x: 0, y: -10, z: 0 }, undefined, COLLISION_GROUPS.player);
    const allowed = controller.computedMovement();
    expect(4 + allowed.y - PLAYER_CONFIG.height / 2).toBeGreaterThanOrEqual(WHITEBOX_COLLISION.ground.topY);
    expect(4 + allowed.y - PLAYER_CONFIG.height / 2).toBeLessThan(WHITEBOX_COLLISION.ground.topY + 0.03);
  } finally {
    world.removeCharacterController(controller);
  }
});

test('shared visible 30cm step and rotated 45-degree ramp both support walking', () => {
  const step = WHITEBOX_SOLIDS.find(solid => solid.id === 'step-30cm')!;
  const player = setup(step.position[0] - step.size[0] / 2 - 1, step.position[2]);
  // Stop sampling at the platform center, before the faster start carries us off its far edge.
  let top = player.body.translation();
  for (let tick = 0; tick < 60 && top.x < step.position[0]; tick++) top = run(player, { ...idle, right: true }, 1);
  expect(top.x).toBeGreaterThanOrEqual(step.position[0]);
  expect(top.x).toBeLessThan(step.position[0] + .11);
  expect(top.y).toBeCloseTo(PLAYER_CONFIG.height / 2 + 0.01 + step.size[1], 2);
  adapter.dispose(); world.free();
  const ramp = WHITEBOX_SOLIDS.find(solid => solid.id === 'ramp-45deg')!;
  const climber = setup(ramp.position[0] - ramp.size[0] * Math.cos(ramp.rotationZ!) / 2 - 1, ramp.position[2]);
  const high = run(climber, { ...idle, right: true }, 65);
  expect(high.x).toBeGreaterThan(ramp.position[0] - 0.5);
  expect(high.y).toBeGreaterThan(2);
});
