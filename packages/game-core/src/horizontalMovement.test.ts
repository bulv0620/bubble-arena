import { expect, test } from 'vitest';
import { PHYSICS_CONFIG, PLAYER_CONFIG, type MovementKeys } from '@bubble-arena/shared';
import { HorizontalMovement } from './horizontalMovement';

const idle: MovementKeys = { forward: false, backward: false, left: false, right: false };

test('acceleration reaches 5m/s without diagonal speed advantage', () => {
  for (const keys of [{ ...idle, forward: true }, { ...idle, forward: true, right: true }]) {
    const movement = new HorizontalMovement();
    let delta = movement.step(keys);
    expect(Math.hypot(delta.x, delta.z) / PHYSICS_CONFIG.timeStep)
      .toBeCloseTo(PLAYER_CONFIG.acceleration * PHYSICS_CONFIG.timeStep);
    for (let tick = 1; tick < 60; tick += 1) delta = movement.step(keys);
    expect(Math.hypot(delta.x, delta.z) / PHYSICS_CONFIG.timeStep).toBeCloseTo(PLAYER_CONFIG.speed);
    expect(delta.y).toBe(0);
  }
});

test('release decelerates to zero and opposing keys cancel', () => {
  const movement = new HorizontalMovement();
  for (let tick = 0; tick < 60; tick += 1) movement.step({ ...idle, right: true });
  expect(movement.step(idle).x / PHYSICS_CONFIG.timeStep)
    .toBeCloseTo(PLAYER_CONFIG.speed - PLAYER_CONFIG.deceleration * PHYSICS_CONFIG.timeStep);
  for (let tick = 0; tick < 20; tick += 1) movement.step(idle);
  expect(movement.step({ forward: true, backward: true, left: true, right: true })).toEqual({ x: 0, y: 0, z: 0 });
});

test('direction reversal remains bounded and independent of render grouping', () => {
  const everyTick = new HorizontalMovement();
  const groupedTicks = new HorizontalMovement();
  let a = 0; let b = 0;
  for (let tick = 0; tick < 120; tick += 1) {
    const keys = { ...idle, right: tick < 60, left: tick >= 60 };
    const delta = everyTick.step(keys);
    expect(Math.abs(delta.x)).toBeLessThanOrEqual(PLAYER_CONFIG.speed * PHYSICS_CONFIG.timeStep);
    a += delta.x;
  }
  for (let frame = 0; frame < 30; frame += 1) {
    for (let substep = 0; substep < 4; substep += 1) {
      const tick = frame * 4 + substep;
      b += groupedTicks.step({ ...idle, right: tick < 60, left: tick >= 60 }).x;
    }
  }
  expect(a).toBeCloseTo(b, 8);
});
