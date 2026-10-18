import type { WeaponId } from './weapons';

export type BulletMaterial = 'solid' | 'wood';
export interface WeaponPenetration {
  readonly personRetention: number;
  readonly woodRetention: number;
  /** Number of complete objects the bullet may pass before stopping at the next. */
  readonly maxPeople: number;
  readonly maxWood: number;
}
export function parseWeaponPenetration(value: unknown): WeaponPenetration {
  const fields = ['personRetention', 'woodRetention', 'maxPeople', 'maxWood'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== fields.length || Reflect.ownKeys(value).some(k => typeof k !== 'string' || !fields.includes(k))
    || fields.some(k => !Object.getOwnPropertyDescriptor(value, k) || !('value' in Object.getOwnPropertyDescriptor(value, k)!))) throw new TypeError('Expected plain penetration config');
  const data = value as WeaponPenetration;
  if (!['personRetention', 'woodRetention'].every(key => {
    const v = data[key as 'personRetention' | 'woodRetention'];
    return Number.isFinite(v) && v >= 0 && v <= 1;
  }) || ![data.maxPeople, data.maxWood].every(v => Number.isSafeInteger(v) && v >= 0 && v <= 8)) {
    throw new TypeError('Invalid weapon penetration profile');
  }
  return Object.freeze({ personRetention: data.personRetention, woodRetention: data.woodRetention,
    maxPeople: data.maxPeople, maxWood: data.maxWood });
}
export const WEAPON_PENETRATION: Readonly<Record<WeaponId, WeaponPenetration>> = Object.freeze({
  sniper: parseWeaponPenetration({ personRetention: .85, woodRetention: .75, maxPeople: 3, maxWood: 2 }),
  rifle: parseWeaponPenetration({ personRetention: .65, woodRetention: .5, maxPeople: 2, maxWood: 1 }),
  shotgun: parseWeaponPenetration({ personRetention: .4, woodRetention: .25, maxPeople: 1, maxWood: 1 }),
  bubble: parseWeaponPenetration({ personRetention: 0, woodRetention: 0, maxPeople: 0, maxWood: 0 }),
});
