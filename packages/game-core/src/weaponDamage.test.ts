import { expect, test } from 'vitest';
import { WEAPON_DAMAGE_PROFILES, type HitRegion } from '@bubble-arena/shared';
import { calculateWeaponDamage } from './weaponDamage';
import { TrainingTargetState } from './trainingTargetState';
const profile = WEAPON_DAMAGE_PROFILES.rifle;
test.each([[0, 40, 20], [20, 40, 20], [30, 35, 18], [40, 30, 15], [60, 20, 10], [70, 20, 10]])(
  'distance %sm applies region multiplier then linear falloff and one integer rounding', (distance, head, body) => {
    expect(calculateWeaponDamage(20, profile, 'head', distance)).toBe(head);
    expect(calculateWeaponDamage(20, profile, 'body', distance)).toBe(body);
  });
test('damage is monotonic through boundaries, configurable per profile and bounded at at least one', () => {
  let previous = 40;
  for (let distance = 0; distance <= 70; distance += .1) {
    const damage = calculateWeaponDamage(20, profile, 'head', distance);
    expect(damage).toBeLessThanOrEqual(previous); expect(damage).toBeGreaterThanOrEqual(20); previous = damage;
  }
  expect(calculateWeaponDamage(20, profile, 'head', 20 - 1e-6)).toBe(40);
  expect(calculateWeaponDamage(20, profile, 'body', 60 + 1e-6)).toBe(10);
  expect(calculateWeaponDamage(20, { ...profile, headMultiplier: 3, falloffStart: 0, falloffEnd: 10, minDamageMultiplier: .25 }, 'head', 10)).toBe(15);
  expect(calculateWeaponDamage(.1, profile, 'body', 70)).toBe(1);
});
test('nonfinite, invalid region/distance/profile and overflow reject', () => {
  for (const base of [NaN, Infinity, -1, 0]) expect(() => calculateWeaponDamage(base, profile, 'head', 0)).toThrow(RangeError);
  for (const distance of [NaN, Infinity, -1]) expect(() => calculateWeaponDamage(20, profile, 'head', distance)).toThrow(RangeError);
  expect(() => calculateWeaponDamage(20, profile, 'leg' as HitRegion, 0)).toThrow(RangeError);
  expect(() => calculateWeaponDamage(20, { ...profile, falloffEnd: 0 }, 'head', 0)).toThrow(RangeError);
  expect(() => calculateWeaponDamage(Number.MAX_VALUE, profile, 'head', 0)).toThrow(RangeError);
});
test('resolved head and far body hits drive actual HP clamp, reject invalid damage before dedup, restore without replay', () => {
  const target = new TrainingTargetState();
  target.receiveHit({ tick: 0, sequence: 1 }, calculateWeaponDamage(20, profile, 'head', 10));
  expect(target.getState()).toMatchObject({ hp: 60, lastDamage: 40 });
  const before = target.getState();
  for (const damage of [NaN, Infinity, 0, -1]) expect(() => target.receiveHit({ tick: 8, sequence: 2 }, damage)).toThrow(RangeError);
  expect(target.getState()).toBe(before);
  target.receiveHit({ tick: 8, sequence: 2 }, calculateWeaponDamage(20, profile, 'body', 60));
  expect(target.getState()).toMatchObject({ hp: 50, lastDamage: 10 });
  target.receiveHit({ tick: 16, sequence: 3 }, 40); target.receiveHit({ tick: 24, sequence: 4 }, 40);
  expect(target.getState()).toMatchObject({ hp: 0, lastDamage: 10, hitCount: 4 });
  expect(target.receiveHit({ tick: 32, sequence: 5 }, 40)).toBe(false);
  for (let i = 0; i < 120; i++) target.step();
  expect(target.getState().hp).toBe(100);
  expect(target.receiveHit({ tick: 32, sequence: 5 }, 40)).toBe(false);
  expect(target.receiveHit({ tick: 160, sequence: 6 }, 40)).toBe(true);
});
