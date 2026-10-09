import { expect, test, vi } from 'vitest';
import { WEAPON_IDS } from './weapons';
import { WEAPON_HANDLING, createWeaponHandling, weaponGroundSpeed, isPrimaryWeaponId } from './weaponHandling';
test('all weapons have immutable tuning; weight order determines held speed and only sniper can scope-slow', () => {
  for (const id of WEAPON_IDS) {
    expect(Object.isFrozen(WEAPON_HANDLING[id])).toBe(true);
    expect(Object.isFrozen(WEAPON_HANDLING[id].spread)).toBe(true);
    expect(Object.isFrozen(WEAPON_HANDLING[id].recoil)).toBe(true);
  }
  expect(weaponGroundSpeed('shotgun')).toBe(5.5); expect(weaponGroundSpeed('bubble')).toBe(5.5);
  expect(weaponGroundSpeed('rifle')).toBe(5); expect(weaponGroundSpeed('sniper')).toBe(4);
  expect(weaponGroundSpeed('sniper', true)).toBeCloseTo(2.8); expect(weaponGroundSpeed('rifle', true)).toBe(5);
  expect(isPrimaryWeaponId('bubble')).toBe(false); expect(isPrimaryWeaponId('sniper')).toBe(true);
  expect(isPrimaryWeaponId('laser')).toBe(false);
});
test('handling rejects malformed parameters/accessors and clones nested tuning', () => {
  const rifle = WEAPON_HANDLING.rifle;
  for (const override of [{ weight: NaN }, { weight: 0 }, { weight: 12 }, { pellets: 0 }, { pellets: 17 }, { fireMode: 'burst' }, { label: '' }])
    expect(() => createWeaponHandling({ ...rifle, ...override } as typeof rifle)).toThrow(RangeError);
  for (const spread of [{ ...rifle.spread, normal: NaN }, { ...rifle.spread, radialPower: 0 }, { ...rifle.spread, normal: 2 }])
    expect(() => createWeaponHandling({ ...rifle, spread })).toThrow(RangeError);
  const get = vi.fn(() => 1);
  expect(() => createWeaponHandling(Object.defineProperty({ ...rifle }, 'weight', { get }))).toThrow(TypeError); expect(get).not.toHaveBeenCalled();
  expect(() => createWeaponHandling({ ...rifle, spread: { normal: 0 } } as typeof rifle)).toThrow(TypeError);
  expect(() => createWeaponHandling({ ...rifle, recoil: null } as unknown as typeof rifle)).toThrow(TypeError);
  const source = { ...rifle, spread: { ...rifle.spread }, recoil: { ...rifle.recoil } }, parsed = createWeaponHandling(source);
  source.spread.normal = .4; expect(parsed.spread.normal).toBe(rifle.spread.normal);
  expect(() => weaponGroundSpeed('laser' as 'rifle')).toThrow(TypeError);
});
