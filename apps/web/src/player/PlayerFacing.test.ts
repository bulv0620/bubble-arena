import { expect, test } from 'vitest';
import { PHYSICS_CONFIG, PLAYER_CONFIG } from '@bubble-arena/shared';
import { PlayerFacing } from './PlayerFacing';

test.each([[1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2], [0, -1, 0], [0, 1, Math.PI]])(
  'turns smoothly toward actual displacement (%s,%s)', (dx, dz, target) => {
    const facing = new PlayerFacing();
    const first = facing.step(dx / 60, dz / 60, PHYSICS_CONFIG.timeStep);
    if (target !== 0) expect(Math.abs(first)).toBeLessThan(Math.abs(target));
    let yaw = first;
    for (let i = 0; i < 120; i++) yaw = facing.step(dx / 60, dz / 60, PHYSICS_CONFIG.timeStep);
    expect(Math.atan2(Math.sin(yaw - target), Math.cos(yaw - target))).toBeCloseTo(0, 8);
  });

test('crossing the +/-pi boundary follows the shortest turn, not a full revolution', () => {
  const facing = new PlayerFacing();
  const move = (yaw: number, dt: number) => facing.step(-Math.sin(yaw) * dt, -Math.cos(yaw) * dt, dt);
  move(3.1, 10);
  const next = move(-3.1, 1 / 60);
  const delta = Math.atan2(Math.sin(next - 3.1), Math.cos(next - 3.1));
  expect(delta).toBeGreaterThan(0);
  expect(delta).toBeLessThan(0.0832);
});

test('stop, contact noise, purely vertical jump and invalid samples retain the last heading', () => {
  const facing = new PlayerFacing(); const dt = 1 / 60;
  facing.step(dt, 0, dt);
  const saved = facing.getYaw();
  for (const [x, z, time] of [[0, 0, dt], [0.00001, -0.00001, dt], [NaN, 0, dt], [0, Infinity, dt], [1, 0, 0], [1, 0, -1]]) {
    expect(facing.step(x, z, time)).toBe(saved);
  }
  expect(PLAYER_CONFIG.turnMinSpeed).toBeGreaterThan(0);
  facing.reset(); facing.reset(); expect(facing.getYaw()).toBe(0);
});

test('constant actual velocity gives equal-time response at 30 and 60Hz', () => {
  const angles = [30, 60].map(hz => {
    const facing = new PlayerFacing();
    for (let i = 0; i < hz / 2; i++) facing.step(1 / hz, 0, 1 / hz);
    return facing.getYaw();
  });
  expect(angles[0]).toBeCloseTo(angles[1], 10);
});

test('aim heading overrides strafe/backward/blocked/air displacement, including standing still', () => {
  for (const [dx, dz] of [[0.05, 0], [0, 0.05], [0, 0], [-0.03, 0.02]]) {
    const facing = new PlayerFacing();
    for (let i = 0; i < 120; i++) facing.step(dx, dz, 1 / 60, 0.8);
    expect(facing.getYaw()).toBeCloseTo(0.8, 8);
  }
});

test('aim yaw wraps smoothly, invalid aim holds, release resumes actual movement facing', () => {
  const facing = new PlayerFacing();
  facing.step(0, 0, 10, 3.1);
  const next = facing.step(0, 0, 1 / 60, -3.1);
  expect(Math.atan2(Math.sin(next - 3.1), Math.cos(next - 3.1))).toBeGreaterThan(0);
  const saved = facing.getYaw();
  for (const invalid of [NaN, Infinity, -Infinity]) expect(facing.step(1, 0, 1 / 60, invalid)).toBe(saved);
  for (let i = 0; i < 120; i++) facing.step(0, 0.05, 1 / 60);
  expect(Math.abs(facing.getYaw())).toBeCloseTo(Math.PI, 8);
});

test('turn response and noise threshold tune independently from movement configuration', () => {
  const slow = new PlayerFacing({ turnResponse: 3 }), fast = new PlayerFacing({ turnResponse: 20 });
  expect(Math.abs(slow.step(0.02, 0, 1 / 60))).toBeLessThan(Math.abs(fast.step(0.02, 0, 1 / 60)));
  const filtered = new PlayerFacing({ turnMinSpeed: 2 });
  expect(filtered.step(0.02, 0, 1 / 60)).toBe(0);
  expect(filtered.step(0, 0, 1 / 60, 1)).toBeGreaterThan(0); // Aim is not displacement-noise gated.
  expect(() => new PlayerFacing({ turnResponse: NaN })).toThrow(RangeError);
});
