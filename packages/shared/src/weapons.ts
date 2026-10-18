export const WEAPON_IDS = Object.freeze(['rifle', 'shotgun', 'sniper', 'bubble'] as const);
export type WeaponId = typeof WEAPON_IDS[number];
/** Fixed carried arsenal; input, simulation and HUD share this order. */
export type WeaponSlot = 1 | 2 | 3 | 4;
export function weaponForSlot(slot: WeaponSlot): WeaponId {
  if (!Number.isInteger(slot) || slot < 1 || slot > WEAPON_IDS.length) throw new TypeError('Invalid weapon slot');
  return WEAPON_IDS[slot - 1]!;
}
export function weaponSlot(id: WeaponId): WeaponSlot {
  if (!isWeaponId(id)) throw new TypeError('Invalid weapon');
  return (WEAPON_IDS.indexOf(id) + 1) as WeaponSlot;
}

/** Configuration only, not mutable ammo, cooldowns or client-authoritative damage. */
export interface WeaponConfig {
  readonly id: WeaponId;
  readonly damage: number;
  /** Shots per second, not an interval in milliseconds. */
  readonly fireRate: number;
  readonly magazineSize: number;
  readonly reserveAmmo: number;
  /** Metres. */
  readonly range: number;
  /** Seconds. */
  readonly reloadDuration: number;
}

const fields = ['id', 'damage', 'fireRate', 'magazineSize', 'reserveAmmo', 'range', 'reloadDuration'] as const;
export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && WEAPON_IDS.some(id => id === value);
}

/** Strict JSON-like data validation; returns an isolated immutable snapshot. */
export function parseWeaponConfig(value: unknown): WeaponConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Expected weapon config object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Expected plain weapon config');
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.some(field => field === key))) {
    throw new TypeError('Weapon config requires exactly the declared fields');
  }
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) throw new TypeError(`Expected data field: ${key}`);
  }
  const data = value as Record<string, unknown>;
  if (!isWeaponId(data.id)) throw new TypeError('Invalid weapon id');
  for (const key of ['damage', 'fireRate', 'range', 'reloadDuration'] as const) {
    if (typeof data[key] !== 'number' || !Number.isFinite(data[key]) || data[key] <= 0) {
      throw new TypeError(`Expected positive finite weapon ${key}`);
    }
  }
  for (const key of ['magazineSize', 'reserveAmmo'] as const) {
    if (typeof data[key] !== 'number' || !Number.isSafeInteger(data[key]) || data[key] < (key === 'magazineSize' ? 1 : 0)) {
      throw new TypeError(`Invalid weapon ${key}`);
    }
  }
  return Object.freeze({ id: data.id, damage: data.damage as number, fireRate: data.fireRate as number,
    magazineSize: data.magazineSize as number, reserveAmmo: data.reserveAmmo as number,
    range: data.range as number, reloadDuration: data.reloadDuration as number });
}

// GAME_DESIGN defaults; no weapon mechanics are implemented by this catalogue.
// Shotgun damage is per pellet; pellet count/spread belong to later firing rules.
export const WEAPON_CONFIGS: Readonly<Record<WeaponId, WeaponConfig>> = Object.freeze({
  rifle: parseWeaponConfig({ id: 'rifle', damage: 20, fireRate: 8, magazineSize: 30, reserveAmmo: 120, range: 70, reloadDuration: 2 }),
  // Two quick shots, then one short reload; timing stays in fixed-step weapon rules.
  shotgun: parseWeaponConfig({ id: 'shotgun', damage: 14, fireRate: 5, magazineSize: 2, reserveAmmo: 30, range: 25, reloadDuration: .65 }),
  sniper: parseWeaponConfig({ id: 'sniper', damage: 80, fireRate: 0.8, magazineSize: 5, reserveAmmo: 20, range: 100, reloadDuration: 3 }),
  bubble: parseWeaponConfig({ id: 'bubble', damage: 25, fireRate: 1, magazineSize: 4, reserveAmmo: 16, range: 40, reloadDuration: 2.5 }),
});
