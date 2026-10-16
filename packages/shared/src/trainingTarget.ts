import { PLAYER_CONFIG } from './player';
import { CAMERA_CONFIG } from './camera';

/** Separate engineering test fixture, not a formal map or player life state. */
export const TRAINING_TARGET_CONFIG = Object.freeze({
  version: 5, maxHp: 100, restoreDuration: 2,
  // Overall movement-sized bounds retained for fixtures; actual sensors use BLOCK_AVATAR_CONFIG.
  radius: PLAYER_CONFIG.radius, capsuleHalfHeight: PLAYER_CONFIG.capsuleHalfHeight,
});

/** Three independently shootable fixtures in front of the range backdrop. */
export const TRAINING_TARGET_LAYOUT = Object.freeze([
  { id: 'training-target-left', label: '左靶', position: Object.freeze([9, PLAYER_CONFIG.height / 2, -7] as const) },
  { id: 'training-target-center', label: '中靶', position: Object.freeze([12, PLAYER_CONFIG.height / 2, -7] as const) },
  { id: 'training-target-right', label: '右靶', position: Object.freeze([15, PLAYER_CONFIG.height / 2, -7] as const) },
].map(entry => Object.freeze(entry)));
export const TRAINING_RANGE_CONFIG = Object.freeze({ playerSpawnXZ: Object.freeze([TRAINING_TARGET_LAYOUT[1].position[0] - CAMERA_CONFIG.shoulderOffset, 0] as const) });
