import { expect, test } from 'vitest';
import { PlayerFacing } from './PlayerFacing';

test('camera heading is exact on every sample, independent of movement or aim mode', () => {
  const facing = new PlayerFacing();
  for (const yaw of [0, 0.8, -1.2, 3.1, -3.1, 10]) {
    expect(facing.step(yaw)).toBeCloseTo(Math.atan2(Math.sin(yaw), Math.cos(yaw)), 12);
  }
});
test('invalid heading holds the last value and reset is idempotent', () => {
  const facing = new PlayerFacing(); facing.step(1.2);
  for (const yaw of [NaN, Infinity, -Infinity]) expect(facing.step(yaw)).toBe(1.2);
  facing.reset(); facing.reset(); expect(facing.getYaw()).toBe(0);
});
