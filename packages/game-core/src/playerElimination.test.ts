import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG } from '@bubble-arena/shared';
import { PlayerHealthState } from './playerHealthState';
const hit = (sequence: number, tick: number, lifeId = 1) => ({ sequence, tick, lifeId });
function down(tick = 100) { const health = new PlayerHealthState(); health.receiveDamage(hit(1, tick), 100, false); return health; }
test('independent finishing damage clips 50→30→10→0 and eliminates once in the same life', () => {
  const health = down();
  for (const [sequence, remaining] of [[2, 30], [3, 10], [4, 0]]) {
    expect(health.receiveDamage(hit(sequence, 100), 20, false)).toBe(true);
    expect(health.getSnapshot()).toMatchObject({ hp: 0, downedHp: remaining, lifeId: 1, revision: remaining ? 1 : 2 });
  }
  const saved = health.getSnapshot(); expect(saved).toMatchObject({ status: 'eliminated', lastDamage: 10, eliminationReason: 'finishing-damage', downedSecondsRemaining: 0, protected: false });
  expect(Object.isFrozen(saved)).toBe(true);
  expect(health.receiveDamage(hit(5, 101), 20, false)).toBe(false); expect(health.advanceTick(101, false)).toBe(false); expect(health.getSnapshot()).toBe(saved);
  expect(health.advanceTick(400, false)).toBe(true); expect(health.getSnapshot()).toMatchObject({ status: 'respawning', revision: 3 });
  expect(health.advanceTick(10000, false)).toBe(false);
});
test('exact 1200-tick deadline and one-second snapshot updates; duplicate/old tick has no effect', () => {
  const health = down(), saved = health.getSnapshot();
  expect(saved.downedSecondsRemaining).toBe(20); expect(health.advanceTick(159, false)).toBe(false); expect(health.getSnapshot()).toBe(saved);
  expect(health.advanceTick(160, false)).toBe(true); const nineteen = health.getSnapshot(); expect(nineteen.downedSecondsRemaining).toBe(19);
  expect(health.advanceTick(160, false)).toBe(false); expect(health.advanceTick(100, false)).toBe(false); expect(health.getSnapshot()).toBe(nineteen);
  health.advanceTick(1299, false); expect(health.getSnapshot()).toMatchObject({ status: 'downed', downedSecondsRemaining: 1 });
  expect(health.advanceTick(1300, false)).toBe(true); expect(health.getSnapshot()).toMatchObject({ status: 'eliminated', downedHp: 0, hp: 0, revision: 2, eliminationReason: 'downed-timeout', lastDamage: 0 });
});
test('finishing injuries do not reset deadline, and a skipped tick cannot grant extra lifetime', () => {
  const health = down(); health.advanceTick(1000, false); health.receiveDamage(hit(2, 1000), 20, false);
  health.advanceTick(1299, false); expect(health.getSnapshot()).toMatchObject({ downedHp: 30, downedSecondsRemaining: 1 });
  health.advanceTick(1301, false); expect(health.getSnapshot().eliminationReason).toBe('downed-timeout');
});
test('same deadline tick damage can finish before expiry; later arrivals cannot steal timeout cause', () => {
  const atDeadline = down(); expect(atDeadline.receiveDamage(hit(2, 1300), 100, false)).toBe(true);
  atDeadline.advanceTick(1300, false); expect(atDeadline.getSnapshot().eliminationReason).toBe('finishing-damage');
  const afterDeadline = down(); expect(afterDeadline.receiveDamage(hit(2, 1301), 100, false)).toBe(false);
  expect(afterDeadline.getSnapshot().eliminationReason).toBe('downed-timeout');
  const resolved = down(); resolved.advanceTick(1300, false); expect(resolved.receiveDamage(hit(2, 1300), 100, false)).toBe(false);
});
test('rescue before deadline clears old timer; a fresh downed episode starts a fresh 20 seconds', () => {
  const health = down(); expect(health.completeRescue({ lifeId: 1, revision: 1, elapsedTicks: 180 }, 1299, false)).toBe(true);
  health.advanceTick(1400, false); expect(health.getSnapshot()).toMatchObject({ status: 'normal', hp: 50, downedSecondsRemaining: 0 });
  health.receiveDamage(hit(2, 1400), 100, false); health.advanceTick(2599, false);
  expect(health.getSnapshot()).toMatchObject({ status: 'downed', revision: 3, downedSecondsRemaining: 1 });
  health.advanceTick(2600, false); expect(health.getSnapshot()).toMatchObject({ status: 'eliminated', revision: 4, lifeId: 1 });
});
test('deadline or eliminated targets cannot be rescued even when expiry has not yet been advanced', () => {
  for (const tick of [1300, 1301]) {
    const health = down(), saved = health.getSnapshot(); expect(health.completeRescue({ lifeId: 1, revision: 1, elapsedTicks: 180 }, tick, false)).toBe(false);
    expect(health.getSnapshot()).toBe(saved); health.advanceTick(tick, false); expect(health.getSnapshot().status).toBe('eliminated');
    expect(health.completeRescue({ lifeId: 1, revision: 2, elapsedTicks: 180 }, tick, false)).toBe(false);
  }
});
test('finished, stale sequence/tick/life and malformed calls cannot change or postpone the deadline', () => {
  const health = down(), saved = health.getSnapshot();
  expect(health.advanceTick(1300, true)).toBe(false); expect(health.receiveDamage(hit(2, 1100), 20, true)).toBe(false);
  for (const h of [hit(1, 101), hit(2, 99), hit(2, 101, 2)]) expect(health.receiveDamage(h, 20, false)).toBe(false);
  for (const tick of [NaN, -1, .5, Number.MAX_SAFE_INTEGER + 1]) expect(() => health.advanceTick(tick, false)).toThrow(RangeError);
  expect(() => health.advanceTick(100, undefined as unknown as boolean)).toThrow(TypeError);
  expect(() => health.receiveDamage(Object.defineProperty(hit(2, 101), 'tick', { get: () => { throw new Error('Must not invoke'); } }), 20, false)).toThrow(TypeError);
  expect(health.getSnapshot()).toBe(saved); health.advanceTick(1300, false); expect(health.getSnapshot().status).toBe('eliminated');
});
test('deadline overflow fails atomically without poisoning the clock, configured duration is isolated and rounded to ticks', () => {
  const health = new PlayerHealthState(), saved = health.getSnapshot();
  expect(() => health.receiveDamage(hit(1, Number.MAX_SAFE_INTEGER), 100, false)).toThrow(RangeError); expect(health.getSnapshot()).toBe(saved);
  expect(health.receiveDamage(hit(1, 0), 100, false)).toBe(true);
  const config = { ...PLAYER_LIFE_CONFIG, downedDuration: 1.01, downedHp: 75 }, custom = new PlayerHealthState(7, config); config.downedDuration = 10;
  custom.receiveDamage(hit(1, 0, 7), 100, false); custom.advanceTick(60, false); expect(custom.getSnapshot()).toMatchObject({ status: 'downed', downedHp: 75, downedSecondsRemaining: 1 });
  custom.advanceTick(61, false); expect(custom.getSnapshot().status).toBe('eliminated'); expect(health.getSnapshot().status).toBe('downed');
});
