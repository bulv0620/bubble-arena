import { expect, test } from 'vitest';
import { RIFLE_SPREAD_CONFIG, PHYSICS_CONFIG } from '@bubble-arena/shared';
import { RifleAccuracy } from './rifleAccuracy';
import { RifleFireState } from './rifleFireState';
const idle = { held: false, pressed: false }, hold = { held: true, pressed: false };
test('accepted first shot uses cold cone; burst blooms only after real accepted shots, bounded and reproducible', () => {
  const a = new RifleAccuracy(), b = new RifleAccuracy(), weapon = new RifleFireState();
  let shots = 0, first = 0, last = 0;
  for (let i = 0; i < 200; i++) {
    const shot = weapon.step(hold);
    const angle = a.step(shot !== null);
    expect(b.step(shot !== null)).toBe(angle);
    if (shot) { shots++; if (shots === 1) first = angle; last = angle; }
    expect(a.getAngle()).toBeLessThanOrEqual(RIFLE_SPREAD_CONFIG.normal + RIFLE_SPREAD_CONFIG.maxBloom);
  }
  expect(first).toBe(RIFLE_SPREAD_CONFIG.normal);
  expect(last).toBeCloseTo(RIFLE_SPREAD_CONFIG.normal + RIFLE_SPREAD_CONFIG.maxBloom);
  expect(shots).toBe(27);
});
test('short burst returns accuracy faster than a long spray; no extra fire during recovery', () => {
  const short = new RifleAccuracy(), long = new RifleAccuracy();
  short.step(true); for (let i = 0; i < 20; i++) long.step(true);
  const before = short.getAngle();
  for (let i = 0; i < Math.ceil(.18 * 60); i++) short.step(false);
  expect(short.getAngle()).toBe(before);
  let shortTicks = 0, longTicks = 0;
  while (short.getAngle() > RIFLE_SPREAD_CONFIG.normal) { short.step(false); shortTicks++; }
  while (long.getAngle() > RIFLE_SPREAD_CONFIG.normal) { long.step(false); longTicks++; }
  expect(shortTicks).toBeLessThan(longTicks);
  expect(longTicks / PHYSICS_CONFIG.tickRate).toBeLessThan(.75);
  expect(short.step(true)).toBe(RIFLE_SPREAD_CONFIG.normal);
});
test('movement/air changes preserve bloom, landing and reset clear only correct state, invalid input cannot advance', () => {
  const rule = new RifleAccuracy(); rule.step(true); const bloom = RIFLE_SPREAD_CONFIG.bloomPerShot;
  rule.setMotion(5, false); expect(rule.getAngle()).toBeCloseTo(RIFLE_SPREAD_CONFIG.normal * RIFLE_SPREAD_CONFIG.movingMultiplier + bloom);
  rule.setMotion(0, true); expect(rule.getAngle()).toBeCloseTo(RIFLE_SPREAD_CONFIG.normal * RIFLE_SPREAD_CONFIG.airborneMultiplier + bloom);
  expect(() => rule.step(1 as unknown as boolean)).toThrow(TypeError);
  expect(() => rule.setMotion(NaN, false)).toThrow(RangeError);
  rule.reset(); expect(rule.getAngle()).toBe(RIFLE_SPREAD_CONFIG.normal);
  expect(rule.step(true)).toBe(RIFLE_SPREAD_CONFIG.normal);
});
test('reload and cancelled input allow full recovery rather than resetting accuracy on trigger releases', () => {
  const rule = new RifleAccuracy(), weapon = new RifleFireState();
  for (let i = 0; i < 100; i++) rule.step(weapon.step(hold) !== null);
  expect(rule.getAngle()).toBeGreaterThan(RIFLE_SPREAD_CONFIG.normal);
  rule.step(weapon.step(idle, true) !== null);
  for (let i = 0; i < 120; i++) rule.step(weapon.step(idle) !== null);
  expect(rule.getAngle()).toBe(RIFLE_SPREAD_CONFIG.normal);
  expect(rule.step(weapon.step(hold) !== null)).toBe(RIFLE_SPREAD_CONFIG.normal);
});
