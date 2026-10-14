import { PHYSICS_CONFIG } from './physics';
export interface RescueProtectionConfig { readonly duration: number }
export function parseRescueProtectionConfig(value: unknown): RescueProtectionConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== 1) throw new TypeError('Invalid rescue protection config');
  const field = Object.getOwnPropertyDescriptor(value, 'duration');
  if (!field || !('value' in field)) throw new TypeError('Expected rescue protection duration');
  const duration = field.value;
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || !Number.isSafeInteger(Math.ceil(duration * PHYSICS_CONFIG.tickRate))) throw new RangeError('Invalid rescue protection duration');
  return Object.freeze({ duration });
}
export const RESCUE_PROTECTION_CONFIG = parseRescueProtectionConfig({ duration: 1 });
