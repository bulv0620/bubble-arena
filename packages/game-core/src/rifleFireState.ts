import { DEFAULT_RIFLE_AMMO_POLICY, WEAPON_CONFIGS, parseWeaponConfig, type RifleAmmoPolicy, type WeaponConfig } from '@bubble-arena/shared';
import { WeaponFireState } from './weaponFireState';
export type { RifleAmmoState, RifleShot } from './weaponFireState';

/** Compatibility adapter for the established rifle-only rule and regression suite. */
export class RifleFireState extends WeaponFireState {
  constructor(config: WeaponConfig = WEAPON_CONFIGS.rifle, policy: RifleAmmoPolicy = DEFAULT_RIFLE_AMMO_POLICY) {
    if (parseWeaponConfig(config).id !== 'rifle') throw new RangeError('Rifle rule requires rifle config');
    super(config, policy, 'auto');
  }
}
