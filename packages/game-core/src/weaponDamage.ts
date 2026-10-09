import { parseWeaponDamageProfile, type HitRegion, type WeaponDamageProfile } from '@bubble-arena/shared';

/** Authority-side damage math. Hit region and travel distance must come from its own query. */
export function calculateWeaponDamage(baseDamage: number, profile: WeaponDamageProfile, region: HitRegion, distance: number): number {
  if (!Number.isFinite(baseDamage) || baseDamage <= 0 || !Number.isFinite(distance) || distance < 0
    || region !== 'head' && region !== 'body') throw new RangeError('Invalid resolved hit damage inputs');
  const config = parseWeaponDamageProfile(profile);
  const progress = Math.max(0, Math.min(1, (distance - config.falloffStart) / (config.falloffEnd - config.falloffStart)));
  const multiplier = region === 'head' ? config.headMultiplier : config.bodyMultiplier;
  const damage = baseDamage * multiplier * (1 - progress * (1 - config.minDamageMultiplier));
  if (!Number.isFinite(damage) || damage > Number.MAX_SAFE_INTEGER) throw new RangeError('Unrepresentable resolved damage');
  return Math.max(1, Math.round(damage));
}
