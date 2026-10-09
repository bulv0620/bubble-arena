import { expect, test, vi } from 'vitest';
import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import { RifleMotion } from './RifleMotion';

test('motion snapshot notifies only on spread changes, stops safely and releases subscriptions', () => {
  const motion = new RifleMotion(), notify = vi.fn(), release = motion.subscribe(notify);
  expect(motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal);
  motion.setSpeed(0.001); expect(notify).not.toHaveBeenCalled();
  motion.setSpeed(5); const moving = motion.getSnapshot(); motion.setSpeed(4);
  expect(notify).toHaveBeenCalledTimes(1); expect(motion.getSnapshot()).toBe(moving);
  motion.setSpeed(0.5); expect(motion.getSnapshot()).toBe(moving); // Coast/braking still moves.
  motion.setSpeed(0); expect(notify).toHaveBeenCalledTimes(2);
  motion.setSpeed(5); motion.reset(); motion.reset(); expect(motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal);
  release(); release(); const count = notify.mock.calls.length; motion.setSpeed(5); expect(notify).toHaveBeenCalledTimes(count);
});
test('invalid physical samples fall back to stationary without leaking a stale wider reticle', () => {
  const motion = new RifleMotion();
  for (const value of [NaN, Infinity, -1]) { motion.setSpeed(5); motion.setSpeed(value); expect(motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal); }
});

test('jump/apex/falling stay widened, grounded stillness restores, reset clears airborne spread', () => {
  const motion = new RifleMotion(), notify = vi.fn(), release = motion.subscribe(notify);
  motion.setSpeed(0, true);
  const moving = RIFLE_SPREAD_CONFIG.normal * RIFLE_SPREAD_CONFIG.airborneMultiplier;
  expect(motion.getSnapshot()).toBe(moving);
  motion.setSpeed(0, true); motion.setSpeed(5, true); motion.setSpeed(5, false);
  expect(notify).toHaveBeenCalledTimes(2); // Landing while running switches to the smaller running penalty.
  motion.setSpeed(0, false); expect(motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal);
  motion.setSpeed(0, true); motion.reset(); expect(motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal);
  release(); notify.mockClear(); motion.setSpeed(0, true); expect(notify).not.toHaveBeenCalled();
});

test('accepted bloom updates HUD after the shot cone is captured and recovers through simulation ticks', () => {
  const motion = new RifleMotion(), notify = vi.fn(), release = motion.subscribe(notify);
  expect(motion.step(true)).toBe(RIFLE_SPREAD_CONFIG.normal);
  expect(motion.getSnapshot()).toBeCloseTo(RIFLE_SPREAD_CONFIG.normal + RIFLE_SPREAD_CONFIG.bloomPerShot);
  const snapshot = motion.getSnapshot(); motion.setSpeed(0); expect(motion.getSnapshot()).toBe(snapshot);
  for (let i = 0; i < 60; i++) motion.step(false);
  expect(motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal);
  motion.step(true); motion.reset(); expect(motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal);
  release(); notify.mockClear(); motion.step(true); expect(notify).not.toHaveBeenCalled();
});
