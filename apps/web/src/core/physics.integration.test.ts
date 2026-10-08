import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PHYSICS_CONFIG, WHITEBOX_CONFIG } from '@bubble-arena/shared';

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
        .setFriction(0.8).setRestitution(0),
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
