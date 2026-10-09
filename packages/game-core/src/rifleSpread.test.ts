import { expect, test } from 'vitest';
import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import { spreadDirection } from './rifleSpread';

test.each([{ x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 }, { x: 2, y: -3, z: 4 }])('uniform cone is normalized and stays inside configured angles for %j', direction => {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  for (const angle of [0, RIFLE_SPREAD_CONFIG.normal, RIFLE_SPREAD_CONFIG.aiming]) {
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      const sample = spreadDirection(direction, angle, (i + 0.5) / 1000, (i * 0.61803398875) % 1)!;
      expect(Math.hypot(sample.x, sample.y, sample.z)).toBeCloseTo(1, 12);
      const dot = (direction.x * sample.x + direction.y * sample.y + direction.z * sample.z) / length;
      expect(dot).toBeGreaterThanOrEqual(Math.cos(angle) - 1e-12); sum += dot;
    }
    expect(sum / 1000).toBeCloseTo((1 + Math.cos(angle)) / 2, 12);
  }
});
test('same authority samples reproduce shots and aiming reduces angular deviation', () => {
  const forward = { x: 0, y: 0, z: -1 };
  const normal = spreadDirection(forward, RIFLE_SPREAD_CONFIG.normal, 0.8, 0.2)!;
  const aim = spreadDirection(forward, RIFLE_SPREAD_CONFIG.aiming, 0.8, 0.2)!;
  expect(spreadDirection(forward, RIFLE_SPREAD_CONFIG.normal, 0.8, 0.2)).toEqual(normal);
  expect(Math.acos(-aim.z)).toBeLessThan(Math.acos(-normal.z));
  expect(Object.isFrozen(normal)).toBe(true);
});
test('rejects invalid vectors, angles and random samples', () => {
  const forward = { x: 0, y: 0, z: -1 };
  for (const angle of [-1, NaN, Infinity, Math.PI]) expect(spreadDirection(forward, angle, 0.5, 0.5)).toBeNull();
  for (const sample of [-1, 1, NaN, Infinity]) {
    expect(spreadDirection(forward, 0.1, sample, 0.5)).toBeNull();
    expect(spreadDirection(forward, 0.1, 0.5, sample)).toBeNull();
  }
  for (const direction of [{ x: 0, y: 0, z: 0 }, { x: NaN, y: 0, z: -1 }]) expect(spreadDirection(direction, 0.1, 0.5, 0.5)).toBeNull();
});
