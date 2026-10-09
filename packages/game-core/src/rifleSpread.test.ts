import { expect, test } from 'vitest';
import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import { spreadDirection, rifleSpreadAngle } from './rifleSpread';

test.each([{ x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 }, { x: 2, y: -3, z: 4 }])('uniform cone is normalized and stays inside configured angles for %j', direction => {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  for (const angle of [0, RIFLE_SPREAD_CONFIG.normal, rifleSpreadAngle(5)]) {
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
test('same authority samples reproduce shots and movement increases angular deviation', () => {
  const forward = { x: 0, y: 0, z: -1 };
  const normal = spreadDirection(forward, RIFLE_SPREAD_CONFIG.normal, 0.8, 0.2)!;
  const moving = spreadDirection(forward, rifleSpreadAngle(5), 0.8, 0.2)!;
  expect(spreadDirection(forward, RIFLE_SPREAD_CONFIG.normal, 0.8, 0.2)).toEqual(normal);
  expect(Math.acos(-moving.z)).toBeGreaterThan(Math.acos(-normal.z));
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

test('actual horizontal speed selects stationary/moving spread with a noise threshold and rejects invalid speed', () => {
  for (const speed of [0, 0.01, RIFLE_SPREAD_CONFIG.movementSpeedThreshold - 1e-6]) expect(rifleSpreadAngle(speed)).toBe(RIFLE_SPREAD_CONFIG.normal);
  for (const speed of [RIFLE_SPREAD_CONFIG.movementSpeedThreshold, 3.5, 5]) expect(rifleSpreadAngle(speed)).toBeCloseTo(.9 * Math.PI / 180, 12);
  for (const invalid of [NaN, Infinity, -1]) expect(() => rifleSpreadAngle(invalid)).toThrow(RangeError);
});

test('airborne movement has its own penalty without stacking with running', () => {
  const normal = RIFLE_SPREAD_CONFIG.normal, moving = normal * RIFLE_SPREAD_CONFIG.airborneMultiplier;
  expect(rifleSpreadAngle(0, false)).toBe(normal);
  expect(rifleSpreadAngle(0, true)).toBe(moving);
  expect(rifleSpreadAngle(5, true)).toBe(moving);
  expect(rifleSpreadAngle(5, false)).toBe(normal * RIFLE_SPREAD_CONFIG.movingMultiplier);
  expect(() => rifleSpreadAngle(0, 1 as unknown as boolean)).toThrow(TypeError);
});

test('rifle sampling favours the centre without exceeding the actual cone or losing reproducibility', async () => {
  const { rifleSpreadDirection } = await import('./rifleSpread');
  const forward = { x: 0, y: 0, z: -1 }, angle = .05;
  let nearCentre = 0;
  for (let i = 0; i < 1000; i++) {
    const radial = (i + .5) / 1000;
    const shot = rifleSpreadDirection(forward, angle, radial, .3)!;
    const deviation = Math.acos(-shot.z);
    expect(deviation).toBeLessThanOrEqual(angle);
    if (deviation <= angle / 2) nearCentre++;
    expect(shot).toEqual(rifleSpreadDirection(forward, angle, radial, .3));
  }
  expect(nearCentre).toBeGreaterThanOrEqual(499); expect(nearCentre).toBeLessThanOrEqual(501);
  for (const invalid of [-1, 1, NaN, Infinity]) expect(rifleSpreadDirection(forward, angle, invalid, .3)).toBeNull();
});
