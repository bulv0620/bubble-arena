import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PHYSICS_CONFIG } from '@bubble-arena/shared';

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
