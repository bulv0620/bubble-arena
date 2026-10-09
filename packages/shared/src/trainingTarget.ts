import { PLAYER_CONFIG } from './player';

/** Separate engineering test fixture, not a formal map or player life state. */
export const TRAINING_TARGET_CONFIG = Object.freeze({
  id: 'training-target-1', version: 1, maxHp: 100,
  position: Object.freeze([-1.45, 1.35, -1.6] as const),
  radius: PLAYER_CONFIG.radius, capsuleHalfHeight: PLAYER_CONFIG.capsuleHalfHeight,
});
