/** Region is resolved by the simulation's hit volumes, never supplied as trusted client input. */
export type HitRegion = 'head' | 'body';
export interface WeaponDamageProfile {
  readonly headMultiplier: number;
  readonly bodyMultiplier: number;
  /** Metres from muzzle to the actual first hit point. */
  readonly falloffStart: number;
  readonly falloffEnd: number;
  readonly minDamageMultiplier: number;
}
const fields = ['headMultiplier', 'bodyMultiplier', 'falloffStart', 'falloffEnd', 'minDamageMultiplier'] as const;
export function parseWeaponDamageProfile(value: unknown): WeaponDamageProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Expected plain damage profile');
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.some(field => field === key))) throw new TypeError('Unexpected damage profile fields');
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'number' || !Number.isFinite(descriptor.value))
      throw new TypeError(`Expected finite damage profile ${field}`);
  }
  const profile = value as WeaponDamageProfile;
  if (profile.headMultiplier <= 0 || profile.bodyMultiplier <= 0 || profile.falloffStart < 0
    || profile.falloffEnd <= profile.falloffStart || profile.minDamageMultiplier <= 0 || profile.minDamageMultiplier > 1)
    throw new RangeError('Invalid damage profile bounds');
  return Object.freeze({ headMultiplier: profile.headMultiplier, bodyMultiplier: profile.bodyMultiplier,
    falloffStart: profile.falloffStart, falloffEnd: profile.falloffEnd, minDamageMultiplier: profile.minDamageMultiplier });
}
/** Damage tuning per weapon; bubble explosion deliberately has no region bonus. */
export const WEAPON_DAMAGE_PROFILES = Object.freeze({
  rifle: parseWeaponDamageProfile({ headMultiplier: 2, bodyMultiplier: 1, falloffStart: 20, falloffEnd: 60, minDamageMultiplier: .5 }),
  shotgun: parseWeaponDamageProfile({ headMultiplier: 1.5, bodyMultiplier: 1, falloffStart: 5, falloffEnd: 25, minDamageMultiplier: .2 }),
  sniper: parseWeaponDamageProfile({ headMultiplier: 2, bodyMultiplier: 1, falloffStart: 0, falloffEnd: 100, minDamageMultiplier: 1 }),
  bubble: parseWeaponDamageProfile({ headMultiplier: 1, bodyMultiplier: 1, falloffStart: 0, falloffEnd: 40, minDamageMultiplier: 1 }),
});
