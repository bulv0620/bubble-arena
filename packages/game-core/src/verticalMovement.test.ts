import { expect, test } from 'vitest';
import { PHYSICS_CONFIG, PLAYER_CONFIG } from '@bubble-arena/shared';
import { VerticalMovement } from './verticalMovement';

test('one second of fixed-step gravity produces the configured vertical speed', () => {
  const movement = new VerticalMovement();
  let displacement = 0;
  for (let tick = 0; tick < PHYSICS_CONFIG.tickRate; tick += 1) displacement += movement.step(false).y;
  expect(movement.getState().velocityY).toBeCloseTo(PHYSICS_CONFIG.gravity[1], 6);
  expect(displacement).toBeLessThan(-10);
});

test('launch uses configurable jump speed and gravity; collision feedback resets vertical speed', () => {
  const movement = new VerticalMovement({ jumpSpeed: 9, gravity: -18 });
  movement.resolve(-0.01, 0, true);
  const first = movement.step(true);
  expect(first.jumped).toBe(true);
  expect(first.y / PHYSICS_CONFIG.timeStep).toBeCloseTo(9 - 18 * PHYSICS_CONFIG.timeStep, 6);
  movement.resolve(first.y, 0, false); // Upward motion blocked by a ceiling.
  expect(movement.getState().velocityY).toBe(0);
  expect(movement.step(false).y).toBeLessThan(0);
  movement.resolve(-0.01, 0, true);
  expect(movement.getState()).toEqual({ grounded: true, velocityY: 0 });
});

test('default trajectory reaches about 1.2m with no collision feedback', () => {
  const movement = new VerticalMovement();
  movement.resolve(-0.01, 0, true);
  let height = 0; let peak = 0;
  for (let tick = 0; tick < 60; tick += 1) {
    height += movement.step(tick === 0).y;
    peak = Math.max(peak, height);
  }
  expect(PLAYER_CONFIG.jumpSpeed).toBe(7);
  expect(peak).toBeGreaterThan(1.1); expect(peak).toBeLessThan(1.3);
  expect(height).toBeLessThan(0);
});

test('invalid vertical parameters fail before corrupting the simulation', () => {
  for (const settings of [
    { gravity: 0, jumpSpeed: 7 }, { gravity: NaN, jumpSpeed: 7 },
    { gravity: -20, jumpSpeed: -1 }, { gravity: -20, jumpSpeed: Infinity },
  ]) expect(() => new VerticalMovement(settings)).toThrow(RangeError);
});
