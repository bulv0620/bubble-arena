import { expect, test, vi } from 'vitest';
import { parseWeaponDamageProfile, WEAPON_DAMAGE_PROFILES } from './weaponDamage';
const rifle = WEAPON_DAMAGE_PROFILES.rifle;
test('damage profiles are isolated immutable validated snapshots', () => {
  const source = { ...rifle }, parsed = parseWeaponDamageProfile(source);
  source.headMultiplier = 9;
  expect(parsed.headMultiplier).toBe(2);
  expect(Object.isFrozen(parsed)).toBe(true);
  expect(Object.isFrozen(WEAPON_DAMAGE_PROFILES)).toBe(true);
  expect(parseWeaponDamageProfile(JSON.parse(JSON.stringify(rifle)))).toEqual(rifle);
  expect(parseWeaponDamageProfile(Object.assign(Object.create(null), rifle))).toEqual(rifle);
  expect(parseWeaponDamageProfile({ ...rifle, minDamageMultiplier: 1, falloffStart: 0 })).toMatchObject({ minDamageMultiplier: 1 });
});
test('malformed profiles and accessors reject without coercion or getter execution', () => {
  for (const value of [null, [], 'rifle', new Date(), { ...rifle, extra: 1 }, { ...rifle, [Symbol('extra')]: 1 }])
    expect(() => parseWeaponDamageProfile(value)).toThrow(TypeError);
  for (const key of Object.keys(rifle)) {
    const missing = { ...rifle } as Record<string, unknown>; delete missing[key];
    expect(() => parseWeaponDamageProfile(missing)).toThrow(TypeError);
    for (const value of [NaN, Infinity, -Infinity, '2', null, true])
      expect(() => parseWeaponDamageProfile({ ...rifle, [key]: value })).toThrow(TypeError);
  }
  const get = vi.fn(() => 2);
  expect(() => parseWeaponDamageProfile(Object.defineProperty({ ...rifle }, 'headMultiplier', { get }))).toThrow(TypeError);
  expect(get).not.toHaveBeenCalled();
});
test('positive region multipliers and ordered falloff interval with nonzero floor are required', () => {
  for (const value of [{ headMultiplier: 0 }, { bodyMultiplier: -1 }, { falloffStart: -1 }, { falloffEnd: 20 },
    { falloffEnd: 19 }, { minDamageMultiplier: 0 }, { minDamageMultiplier: 1.1 }])
    expect(() => parseWeaponDamageProfile({ ...rifle, ...value })).toThrow(RangeError);
});
