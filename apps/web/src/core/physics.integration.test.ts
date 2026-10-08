import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLIDER_MATERIALS, PHYSICS_CONFIG, PLAYER_CONFIG, WHITEBOX_CONFIG } from '@bubble-arena/shared';
import { CapsuleGeometry } from 'three';

let world: RAPIER.World | undefined;

beforeAll(async () => { await RAPIER.init(); });
afterEach(() => { world?.free(); world = undefined; });

function createWorld() {
  const [x, y, z] = PHYSICS_CONFIG.gravity;
  world = new RAPIER.World({ x, y, z });
  world.timestep = PHYSICS_CONFIG.timeStep;
  return world;
}

test('real Rapier WASM can step an empty world with no automatic bodies or colliders', () => {
  const simulation = createWorld();
  for (let tick = 0; tick < PHYSICS_CONFIG.tickRate; tick += 1) simulation.step();
  expect(simulation.timestep).toBeCloseTo(PHYSICS_CONFIG.timeStep, 6);
  expect(simulation.bodies.len()).toBe(0);
  expect(simulation.colliders.len()).toBe(0);
});

test('60 fixed steps simulate one second of gravity for a temporary test body', () => {
  const simulation = createWorld();
  const body = simulation.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 10, 0).setAdditionalMass(1),
  );
  for (let tick = 0; tick < PHYSICS_CONFIG.tickRate; tick += 1) simulation.step();
  expect(body.linvel().y).toBeCloseTo(PHYSICS_CONFIG.gravity[1], 3);
  expect(body.translation().y).toBeLessThan(10);
});

function dropCube(x: number, withGround = true) {
  const simulation = createWorld();
  const { groundSize, groundThickness, groundTopY, testCubeSize, testCubeStartY } = WHITEBOX_CONFIG;
  if (withGround) {
    const ground = simulation.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    simulation.createCollider(
      RAPIER.ColliderDesc.cuboid(groundSize / 2, groundThickness / 2, groundSize / 2)
        .setTranslation(0, groundTopY - groundThickness / 2, 0)
        .setFriction(COLLIDER_MATERIALS.ground.friction).setRestitution(COLLIDER_MATERIALS.ground.restitution),
      ground,
    );
  }
  const cube = simulation.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(x, testCubeStartY, 0).setCcdEnabled(true),
  );
  simulation.createCollider(
    RAPIER.ColliderDesc.cuboid(testCubeSize / 2, testCubeSize / 2, testCubeSize / 2).setRestitution(0),
    cube,
  );
  for (let tick = 0; tick < PHYSICS_CONFIG.tickRate * 5; tick += 1) simulation.step();
  return cube;
}

test.each([0, WHITEBOX_CONFIG.groundSize / 2 - 1])('ground arrests a falling cube at x=%s', (x) => {
  const cube = dropCube(x);
  const expectedY = WHITEBOX_CONFIG.groundTopY + WHITEBOX_CONFIG.testCubeSize / 2;
  expect(cube.translation().y).toBeGreaterThan(expectedY - 0.02);
  expect(cube.translation().y).toBeLessThan(expectedY + 0.02);
  expect(Math.abs(cube.linvel().y)).toBeLessThan(0.05);
});

test('removing the ground allows the same cube to fall through y=0', () => {
  expect(dropCube(0, false).translation().y).toBeLessThan(-10);
});

test('outside the finite 80m ground the cube is not supported by an invisible floor', () => {
  expect(dropCube(WHITEBOX_CONFIG.groundSize / 2 + 2).translation().y).toBeLessThan(-10);
});

test('capsule visual bounds and real collider agree at the translated spawn', () => {
  const simulation = createWorld();
  const { height, radius, capsuleHalfHeight } = PLAYER_CONFIG;
  const [x, z] = WHITEBOX_CONFIG.playerSpawnXZ;
  const y = WHITEBOX_CONFIG.groundTopY + height / 2;
  const body = simulation.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z),
  );
  const collider = simulation.createCollider(RAPIER.ColliderDesc.capsule(capsuleHalfHeight, radius), body);
  const geometry = new CapsuleGeometry(radius, capsuleHalfHeight * 2, 8, 16);
  try {
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.y + y).toBeCloseTo(WHITEBOX_CONFIG.groundTopY, 6);
    expect(geometry.boundingBox!.max.y + y).toBeCloseTo(WHITEBOX_CONFIG.groundTopY + height, 6);
    expect(geometry.boundingBox!.max.x).toBeCloseTo(radius, 6);
    simulation.step();
    // Real shape queries verify the capsule top and side, including world offset.
    expect(collider.castRay(new RAPIER.Ray({ x, y: y + 2, z }, { x: 0, y: -1, z: 0 }), 4, true))
      .toBeCloseTo(2 - height / 2, 5);
    expect(collider.castRay(new RAPIER.Ray({ x: x + 2, y, z }, { x: -1, y: 0, z: 0 }), 4, true))
      .toBeCloseTo(2 - radius, 5);
    expect(collider.castRay(new RAPIER.Ray({ x: x + radius + 0.01, y: y + 2, z }, { x: 0, y: -1, z: 0 }), 4, true))
      .toBe(-1);
    for (let tick = 0; tick < PHYSICS_CONFIG.tickRate * 5; tick += 1) simulation.step();
    expect(body.translation()).toEqual({ x, y: expect.closeTo(y, 6), z });
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 });
    simulation.removeRigidBody(body);
    expect(simulation.bodies.len()).toBe(0);
    expect(simulation.colliders.len()).toBe(0);
  } finally {
    geometry.dispose();
  }
});
