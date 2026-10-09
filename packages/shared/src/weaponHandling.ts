import { WEAPON_IDS, isWeaponId, type WeaponId } from './weapons';
import { RIFLE_SPREAD_CONFIG } from './rifleSpread';
import { RIFLE_RECOIL_CONFIG, createRifleRecoilTuning, type RifleRecoilTuning } from './rifleRecoil';

export type PrimaryWeaponId = Exclude<WeaponId, 'bubble'>;
export const PRIMARY_WEAPON_IDS = Object.freeze(['rifle', 'shotgun', 'sniper'] as const);
export const isPrimaryWeaponId = (id: unknown): id is PrimaryWeaponId => isWeaponId(id) && id !== 'bubble';
export interface WeaponHandling {
  readonly label: string;
  readonly weight: number;
  readonly fireMode: 'auto' | 'semi';
  readonly pellets: number;
  readonly spread: Readonly<Record<keyof typeof RIFLE_SPREAD_CONFIG, number>>;
  readonly recoil: RifleRecoilTuning;
}
const degree = Math.PI / 180;
export function createWeaponHandling(config: WeaponHandling): WeaponHandling {
  const dataObject = (value: object, keys: readonly string[]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || Reflect.ownKeys(value).length !== keys.length || Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key))) throw new TypeError('Invalid handling fields');
    for (const key of keys) if (!Object.getOwnPropertyDescriptor(value, key) || !('value' in Object.getOwnPropertyDescriptor(value, key)!)) throw new TypeError('Handling accessors are not allowed');
  };
  dataObject(config, ['label', 'weight', 'fireMode', 'pellets', 'spread', 'recoil']);
  dataObject(config.spread, Object.keys(RIFLE_SPREAD_CONFIG));
  dataObject(config.recoil, Object.keys(RIFLE_RECOIL_CONFIG));
  if (typeof config.label !== 'string' || !config.label.trim() || !Number.isFinite(config.weight) || config.weight <= 0 || config.weight >= 12
    || !['auto', 'semi'].includes(config.fireMode) || !Number.isSafeInteger(config.pellets) || config.pellets < 1 || config.pellets > 16)
    throw new RangeError('Invalid weapon handling');
  const s = config.spread;
  if (!Object.values(s).every(Number.isFinite) || s.normal < 0 || s.normal > Math.PI / 2
    || s.movingMultiplier < 1 || s.airborneMultiplier < 1 || s.movementSpeedThreshold < 0
    || s.bloomPerShot < 0 || s.maxBloom < 0 || s.recoveryDelay < 0 || s.recoveryPerSecond < 0 || s.radialPower <= 0
    || s.normal * Math.max(s.movingMultiplier, s.airborneMultiplier) + s.maxBloom > Math.PI / 2)
    throw new RangeError('Invalid weapon spread');
  return Object.freeze({ ...config, spread: Object.freeze({ ...s }), recoil: createRifleRecoilTuning(config.recoil) });
}
export const WEAPON_HANDLING: Readonly<Record<WeaponId, WeaponHandling>> = Object.freeze({
  rifle: createWeaponHandling({ label: '步枪', weight: 2, fireMode: 'auto', pellets: 1, spread: RIFLE_SPREAD_CONFIG, recoil: RIFLE_RECOIL_CONFIG }),
  shotgun: createWeaponHandling({ label: '霰弹枪', weight: 1, fireMode: 'semi', pellets: 8,
    spread: { ...RIFLE_SPREAD_CONFIG, normal: 6 * degree, movingMultiplier: 1.2, airborneMultiplier: 1.5, bloomPerShot: 0, maxBloom: 0, radialPower: 1 },
    recoil: { ...RIFLE_RECOIL_CONFIG, kickAngle: 2 * degree, maxAngle: 4 * degree, pulseAngle: 1 * degree, maxPulseAngle: 1.2 * degree } }),
  sniper: createWeaponHandling({ label: '狙击枪', weight: 4, fireMode: 'semi', pellets: 1,
    spread: { ...RIFLE_SPREAD_CONFIG, normal: 5 * degree, movingMultiplier: 1.5, airborneMultiplier: 2, bloomPerShot: 0, maxBloom: 0 },
    recoil: { ...RIFLE_RECOIL_CONFIG, kickAngle: 3 * degree, maxAngle: 5 * degree, pulseAngle: 1.2 * degree, maxPulseAngle: 1.5 * degree } }),
  bubble: createWeaponHandling({ label: '泡泡发射器', weight: 1, fireMode: 'semi', pellets: 1,
    spread: { ...RIFLE_SPREAD_CONFIG, normal: 0, bloomPerShot: 0, maxBloom: 0 },
    recoil: { ...RIFLE_RECOIL_CONFIG, kickAngle: .6 * degree, maxAngle: 2 * degree, pulseAngle: .3 * degree, maxPulseAngle: .5 * degree } }),
});
export const SNIPER_SCOPE_CONFIG = Object.freeze({ fov: 24, speedMultiplier: .7, normal: 0, moving: .15 * degree, airborne: .75 * degree });
export const BUBBLE_CONFIG = Object.freeze({ radius: .15, speed: 20, lifetime: 2, explosionRadius: 2, slowMultiplier: .5, slowDuration: 2, capacity: 8 });
/** Weight is a gameplay tier, not kilograms; only the held weapon determines speed. */
export function weaponGroundSpeed(id: WeaponId, scoped = false) {
  if (!WEAPON_IDS.includes(id) || typeof scoped !== 'boolean') throw new TypeError('Invalid equipped weapon');
  return (6 - WEAPON_HANDLING[id].weight * .5) * (id === 'sniper' && scoped ? SNIPER_SCOPE_CONFIG.speedMultiplier : 1);
}
