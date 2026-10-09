import { PLAYER_VITALS_CONFIG } from '@bubble-arena/shared';
export interface PlayerVitals { readonly hp: number; readonly maxHp: number }
/** Read-only initial player state, separate from the training fixture. */
export function createPlayerVitals(maxHp: number = PLAYER_VITALS_CONFIG.maxHp): PlayerVitals {
  if (!Number.isSafeInteger(maxHp) || maxHp <= 0) throw new RangeError('Expected positive safe-integer player HP');
  return Object.freeze({ hp: maxHp, maxHp });
}
