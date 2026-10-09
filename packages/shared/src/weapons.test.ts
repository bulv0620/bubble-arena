import { expect, test, vi } from 'vitest';
import { WEAPON_CONFIGS, WEAPON_IDS, isWeaponId, parseWeaponConfig } from './weapons';

const rifle = { ...WEAPON_CONFIGS.rifle };
test('all declared IDs have matching validated immutable defaults and fractional rates remain valid', () => {
  expect(WEAPON_IDS).toEqual(['rifle', 'shotgun', 'sniper', 'bubble']);
  for (const id of WEAPON_IDS) {
    expect(isWeaponId(id)).toBe(true);
    expect(parseWeaponConfig(WEAPON_CONFIGS[id])).toEqual(WEAPON_CONFIGS[id]);
    expect(WEAPON_CONFIGS[id].id).toBe(id);
    expect(Object.isFrozen(WEAPON_CONFIGS[id])).toBe(true);
  }
  expect(Object.isFrozen(WEAPON_CONFIGS)).toBe(true);
  expect(WEAPON_CONFIGS.rifle).toEqual({ id: 'rifle', damage: 20, fireRate: 8, magazineSize: 30, reserveAmmo: 120, range: 70, reloadDuration: 2 });
  expect(WEAPON_CONFIGS.sniper.fireRate).toBe(0.8);
  expect(parseWeaponConfig({ ...rifle, reserveAmmo: 0 }).reserveAmmo).toBe(0);
  const source = { ...rifle }, parsed = parseWeaponConfig(source);
  source.damage = 999; expect(parsed.damage).toBe(20);
});

test.each(['', 'RIFLE', 'laser', 0, null, {}, ['rifle']])('invalid ID %j is rejected without coercion', id => {
  expect(isWeaponId(id)).toBe(false);
  expect(() => parseWeaponConfig({ ...rifle, id })).toThrow(TypeError);
});

test.each(['damage', 'fireRate', 'range', 'reloadDuration'] as const)('%s rejects nonpositive/nonfinite/coerced numbers', key => {
  for (const value of [0, -1, NaN, Infinity, -Infinity, '20', true, null, undefined]) {
    expect(() => parseWeaponConfig({ ...rifle, [key]: value })).toThrow(TypeError);
  }
});

test.each(['magazineSize', 'reserveAmmo'] as const)('%s rejects fractional/unsafe/nonfinite ammo', key => {
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '30', false, null]) {
    expect(() => parseWeaponConfig({ ...rifle, [key]: value })).toThrow(TypeError);
  }
  expect(() => parseWeaponConfig({ ...rifle, magazineSize: 0 })).toThrow(TypeError);
});

test('missing fields, unknown fields, arrays, prototypes and accessors fail rather than silently normalize', () => {
  for (const value of [null, [], 'rifle', 42, new Date(), { ...rifle, extra: 1 }, { ...rifle, [Symbol('extra')]: 1 }]) {
    expect(() => parseWeaponConfig(value)).toThrow(TypeError);
  }
  for (const key of Object.keys(rifle)) {
    const value = { ...rifle } as Record<string, unknown>; delete value[key];
    expect(() => parseWeaponConfig(value)).toThrow(TypeError);
  }
  const get = vi.fn(() => 20);
  const accessor = Object.defineProperty({ ...rifle }, 'damage', { get });
  expect(() => parseWeaponConfig(accessor)).toThrow(TypeError); expect(get).not.toHaveBeenCalled();
  const json = JSON.parse(JSON.stringify(rifle)) as unknown;
  expect(parseWeaponConfig(json)).toEqual(rifle);
  expect(parseWeaponConfig(Object.assign(Object.create(null), rifle))).toEqual(rifle);
});
