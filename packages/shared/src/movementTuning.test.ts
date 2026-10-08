import { expect, test } from 'vitest';
import { createMovementTuning, PLAYER_CONFIG } from './player';

test('defaults and override snapshots are isolated, validated and immutable', () => {
  const overrides = { acceleration: 10 }, tuning = createMovementTuning(overrides);
  overrides.acceleration = 999;
  expect(tuning.acceleration).toBe(10);
  expect(tuning.deceleration).toBe(PLAYER_CONFIG.deceleration);
  expect(tuning.airControl).toBe(PLAYER_CONFIG.airControl);
  expect(tuning.turnResponse).toBe(PLAYER_CONFIG.turnResponse);
  expect(Object.isFrozen(tuning)).toBe(true);
  expect(createMovementTuning({ airControl: 0, turnMinSpeed: 0 }).airControl).toBe(0);
});

test.each([
  { acceleration: NaN }, { deceleration: Infinity }, { speed: 0 }, { aimSpeed: -1 },
  { airControl: -0.1 }, { airControl: 1.1 }, { turnResponse: 0 }, { turnMinSpeed: -1 },
])('invalid configuration %j rejects before simulation', overrides => {
  expect(() => createMovementTuning(overrides)).toThrow(RangeError);
});
