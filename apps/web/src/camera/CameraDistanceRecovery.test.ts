import { expect, test } from 'vitest';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { CameraDistanceRecovery } from './CameraDistanceRecovery';

function step(recovery: CameraDistanceRecovery, safe: number, dt: number) {
  const plan = recovery.preview(safe, dt);
  if (!plan) throw new Error('invalid proposal');
  recovery.commit(plan);
  return plan.distance;
}

test('contracts immediately, holds briefly and restores monotonically without overshoot', () => {
  const recovery = new CameraDistanceRecovery();
  expect(step(recovery, 4.5, 0)).toBe(4.5);
  expect(step(recovery, 0.8, 0)).toBe(0.8);
  let distance = step(recovery, 4.5, CAMERA_CONFIG.recoveryDelay / 2);
  expect(distance).toBe(0.8);
  for (let i = 0; i < 180; i++) {
    const next = step(recovery, 4.5, 1 / 60);
    expect(next).toBeGreaterThanOrEqual(distance);
    expect(next).toBeLessThanOrEqual(4.5);
    distance = next;
  }
  expect(distance).toBe(4.5);
  expect(step(recovery, 0.2, NaN)).toBe(0.2); // Safety never waits for a valid dt.
});

test('30Hz and 60Hz restore the same distance after equal elapsed time', () => {
  const distances = [30, 60].map(hz => {
    const recovery = new CameraDistanceRecovery();
    step(recovery, 4.5, 0); step(recovery, 1, 0);
    let distance = 1;
    for (let i = 0; i < hz; i++) distance = step(recovery, 4.5, 1 / hz);
    return distance;
  });
  expect(distances[0]).toBeCloseTo(distances[1], 10);
  expect(distances[0]).toBeGreaterThan(4.4);
  expect(distances[0]).toBeLessThan(4.5);
});

test('alternating wall hits and brief clear frames do not pump the distance outward', () => {
  const recovery = new CameraDistanceRecovery();
  step(recovery, 4.5, 0); step(recovery, 1, 0);
  for (let i = 0; i < 120; i++) {
    expect(step(recovery, i % 2 ? 1 : 4.5, 1 / 60)).toBe(1);
  }
  let distance = 1;
  for (let i = 0; i < 60; i++) distance = step(recovery, 4.5, 1 / 60);
  expect(distance).toBeGreaterThan(4.4);
});

test('invalid proposals, failed candidate checks and reset cannot leave stale recovery state', () => {
  const recovery = new CameraDistanceRecovery();
  step(recovery, 4.5, 0); step(recovery, 1, 0);
  for (const value of [NaN, Infinity, -Infinity, -1]) expect(recovery.preview(value, 1 / 60)).toBeNull();
  recovery.preview(4.5, 0.1); // Simulates a failed collision check: do not commit.
  expect(step(recovery, 4.5, 0.05)).toBe(1);
  for (const dt of [0, -1, NaN, Infinity]) expect(step(recovery, 4.5, dt)).toBe(1);
  recovery.reset(); recovery.reset();
  expect(step(recovery, 4.5, 0)).toBe(4.5);
});

test('long frame after a pause is capped so recovery cannot jump to full distance', () => {
  const recovery = new CameraDistanceRecovery();
  step(recovery, 4.5, 0); step(recovery, 1, 0);
  step(recovery, 4.5, CAMERA_CONFIG.recoveryDelay);
  const next = step(recovery, 4.5, 30);
  expect(next).toBeGreaterThan(1);
  expect(next).toBeLessThan(3);
});
