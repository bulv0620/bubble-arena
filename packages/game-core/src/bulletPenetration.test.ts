import { expect, test } from 'vitest';
import { WEAPON_CONFIGS, WEAPON_DAMAGE_PROFILES, WEAPON_PENETRATION, parseWeaponPenetration, type WeaponId } from '@bubble-arena/shared';
import { resolveBulletPenetration, type BulletContact } from './bulletPenetration';
import { calculateWeaponDamage } from './weaponDamage';
const person = (target: string, distance: number): BulletContact<string> => ({ kind: 'person', target, distance, region: 'body' });
const wood = (key: number, distance: number): BulletContact<string> => ({ kind: 'wood', key, distance });
test.each(['sniper', 'rifle', 'shotgun'] as const)('%s attenuates each unique body/box in distance order and enforces passage limits', weapon => {
  const profile = WEAPON_PENETRATION[weapon];
  const contacts = [person('a', 2), person('b', 4), person('c', 6), person('d', 8), person('e', 10)];
  const result = resolveBulletPenetration(weapon, 100, contacts.reverse());
  expect(result.hits).toHaveLength(profile.maxPeople + 1);
  result.hits.forEach((h, i) => expect(h.multiplier).toBeCloseTo(profile.personRetention ** i));
  expect(result.distance).toBe((profile.maxPeople + 1) * 2); expect(result.stopped).toBe(true);
  const boxes = resolveBulletPenetration(weapon, 100, [wood(1, 1), person('a', 2), wood(2, 3), person('b', 4), wood(3, 5), person('c', 6)]);
  expect(boxes.hits).toHaveLength(profile.maxWood);
  boxes.hits.forEach((h, i) => expect(h.multiplier).toBeCloseTo(profile.woodRetention ** (i + 1) * profile.personRetention ** i));
});
test('overlapping head/body and repeated box contacts are charged once; nearest region wins', () => {
  const result = resolveBulletPenetration('rifle', 70, [person('a', 4), { ...person('a', 2), region: 'head' }, wood(1, 1), wood(1, 1.5), person('b', 5)]);
  expect(result.hits.map(h => [h.contact.region, h.multiplier])).toEqual([['head', .5], ['body', .325]]);
  expect(result.impacts).toHaveLength(3); expect(result.distance).toBe(70); expect(result.stopped).toBe(false);
});
test('map takes priority at coincident surfaces, rejects hits behind walls/out of range, does not mutate contacts', () => {
  const contacts: readonly BulletContact<string>[] = Object.freeze([person('a', 2), { kind: 'solid', key: 1, distance: 2.0005 }, person('b', 8)]);
  expect(resolveBulletPenetration('sniper', 100, contacts).hits).toEqual([]);
  expect(resolveBulletPenetration('rifle', 1, contacts)).toMatchObject({ hits: [], impacts: [], distance: 1, stopped: false });
  expect(contacts[0].distance).toBe(2);
});
test('damage multiplies part/falloff/penetration before one final round; no range reset or sniper distance falloff', () => {
  expect(calculateWeaponDamage(20, WEAPON_DAMAGE_PROFILES.rifle, 'body', 30, .5)).toBe(9);
  expect(calculateWeaponDamage(20, WEAPON_DAMAGE_PROFILES.rifle, 'head', 40, .65 * .5)).toBe(10);
  expect(calculateWeaponDamage(80, WEAPON_DAMAGE_PROFILES.sniper, 'head', 99, .75)).toBe(120);
  expect(calculateWeaponDamage(14, WEAPON_DAMAGE_PROFILES.shotgun, 'body', 3, .4)).toBe(6);
  expect(calculateWeaponDamage(14, WEAPON_DAMAGE_PROFILES.shotgun, 'body', 3, .25)).toBe(4);
  expect(WEAPON_CONFIGS.rifle.damage).toBe(20);
  for (const bad of [0, -1, NaN, Infinity, 1.01]) expect(() => calculateWeaponDamage(20, WEAPON_DAMAGE_PROFILES.rifle, 'body', 3, bad)).toThrow();
});
test('invalid profiles and authority contacts fail before resolution; bubble cannot penetrate', () => {
  const config = WEAPON_PENETRATION.rifle;
  for (const invalid of [{ ...config, maxWood: 1.5 }, { ...config, personRetention: NaN }, { ...config, maxPeople: 999 }, { ...config, woodRetention: -1 }]) expect(() => parseWeaponPenetration(invalid)).toThrow();
  expect(Object.isFrozen(config)).toBe(true);
  for (const distance of [-1, NaN, Infinity]) expect(() => resolveBulletPenetration('rifle', 70, [person('a', distance)])).toThrow();
  expect(() => resolveBulletPenetration('bad' as WeaponId, 70, [])).toThrow();
  expect(() => resolveBulletPenetration('rifle', 0, [])).toThrow();
  expect(resolveBulletPenetration('bubble', 40, [wood(1, 1), person('a', 2)]).hits).toEqual([]);
});
