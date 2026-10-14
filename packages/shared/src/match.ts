/** Authority-owned match settings. Durations are integral seconds at the fixed tick rate. */
export interface MatchConfig { readonly countdownSeconds: number; readonly durationSeconds: number; readonly scoreLimit: number }
export const MATCH_CONFIG: MatchConfig = Object.freeze({ countdownSeconds: 3, durationSeconds: 300, scoreLimit: 20 });
export type MatchPhase = 'waiting' | 'countdown' | 'playing' | 'finished';
export function parseMatchConfig(value: unknown): MatchConfig {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Invalid match config');
  const keys = ['countdownSeconds', 'durationSeconds', 'scoreLimit'] as const;
  if (Reflect.ownKeys(value).length !== keys.length) throw new TypeError('Unexpected match config field');
  const result = {} as Record<typeof keys[number], number>;
  for (const key of keys) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field || !('value' in field) || !Number.isSafeInteger(field.value) || field.value < 1 || field.value > (key === 'countdownSeconds' ? 10 : key === 'durationSeconds' ? 3600 : 1000)) throw new RangeError('Invalid match config field');
    result[key] = field.value;
  }
  return Object.freeze(result);
}
