import { PLAYER_CONFIG } from './player';

/** One geometry source for the engineering visual and training damage sensors. */
export const BLOCK_AVATAR_CONFIG = Object.freeze({
  headRadius: PLAYER_CONFIG.radius,
  headY: PLAYER_CONFIG.height / 2 - PLAYER_CONFIG.radius,
  bodyRadius: PLAYER_CONFIG.radius * .86,
  bodyY: -PLAYER_CONFIG.radius,
  bodyHalfHeight: (PLAYER_CONFIG.height - PLAYER_CONFIG.radius * 2 - PLAYER_CONFIG.radius * 2 * .86) / 2,
});
