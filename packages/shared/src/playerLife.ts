import { PHYSICS_CONFIG } from './physics';
import { PLAYER_VITALS_CONFIG } from './playerVitals';

export const PLAYER_LIFE_STATUSES = Object.freeze(['normal', 'downed', 'eliminated', 'respawning'] as const);
export type PlayerLifeStatus = typeof PLAYER_LIFE_STATUSES[number];
export interface PlayerLifeSnapshot {
  readonly status: PlayerLifeStatus;
  readonly lifeId: number;
  /** Every accepted transition advances the revision, including rescue within one life. */
  readonly revision: number;
}
export interface PlayerLifeConfig {
  readonly downedHp: number;
  readonly revivedHp: number;
  readonly downedDuration: number;
  readonly rescueDuration: number;
  readonly respawnDelay: number;
}
const configKeys = ['downedHp', 'revivedHp', 'downedDuration', 'rescueDuration', 'respawnDelay'] as const;
function dataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Expected life data object');
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !('value' in Object.getOwnPropertyDescriptor(value, key)!)) throw new TypeError('Invalid life data field');
  }
  return value as Record<string, unknown>;
}
const safeInteger = (value: unknown, minimum: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
export function parsePlayerLifeConfig(value: unknown): PlayerLifeConfig {
  const data = dataRecord(value);
  if (Reflect.ownKeys(data).length !== configKeys.length || configKeys.some(key => !Object.hasOwn(data, key))) throw new TypeError('Invalid life config fields');
  if (!safeInteger(data.downedHp, 1) || !safeInteger(data.revivedHp, 1) || data.revivedHp > PLAYER_VITALS_CONFIG.maxHp) throw new RangeError('Invalid life health config');
  for (const key of ['downedDuration', 'rescueDuration', 'respawnDelay'] as const) {
    const seconds = data[key];
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0
      || !Number.isSafeInteger(Math.ceil(seconds * PHYSICS_CONFIG.tickRate))) throw new RangeError('Invalid life duration');
  }
  return Object.freeze(Object.fromEntries(configKeys.map(key => [key, data[key]]))) as unknown as PlayerLifeConfig;
}
export const PLAYER_LIFE_CONFIG = parsePlayerLifeConfig({ downedHp: 300, revivedHp: 50, downedDuration: 20, rescueDuration: 2, respawnDelay: 5 });

type EventIdentity = Readonly<Pick<PlayerLifeSnapshot, 'lifeId' | 'revision'>>;
/** Internal authoritative facts, never client commands or a network message schema. */
export type PlayerLifeEvent = EventIdentity & (
  | { readonly type: 'hp_depleted'; readonly hp: number }
  | { readonly type: 'downed_timeout' | 'rescue_completed' | 'respawn_due'; readonly elapsedTicks: number }
  | { readonly type: 'environment_death' | 'spawn_completed' }
);
export function parsePlayerLifeEvent(value: unknown): PlayerLifeEvent {
  const data = dataRecord(value), keys = ['type', 'lifeId', 'revision'];
  switch (data.type) {
    case 'hp_depleted': keys.push('hp'); break;
    case 'downed_timeout': case 'rescue_completed': case 'respawn_due': keys.push('elapsedTicks'); break;
    case 'environment_death': case 'spawn_completed': break;
    default: throw new TypeError('Invalid life event type');
  }
  if (Reflect.ownKeys(data).length !== keys.length || keys.some(key => !Object.hasOwn(data, key))) throw new TypeError('Invalid life event fields');
  if (!safeInteger(data.lifeId, 1) || !safeInteger(data.revision, 0)
    || keys.includes('hp') && !safeInteger(data.hp, 0)
    || keys.includes('elapsedTicks') && !safeInteger(data.elapsedTicks, 0)) throw new RangeError('Invalid life event values');
  return Object.freeze({ ...data }) as unknown as PlayerLifeEvent;
}
