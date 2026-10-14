import { PLAYER_LIFE_STATUSES, PLAYER_LIFE_CONTROL_CONFIG, type PlayerLifeStatus } from '@bubble-arena/shared';
export interface PlayerActionPolicy {
  readonly canMove: boolean;
  readonly canJump: boolean;
  readonly canUseWeapons: boolean;
  readonly canRescue: boolean;
  readonly maximumSpeed: number | null;
}
const policies: Readonly<Record<PlayerLifeStatus, PlayerActionPolicy>> = Object.freeze({
  normal: Object.freeze({ canMove: true, canJump: true, canUseWeapons: true, canRescue: true, maximumSpeed: null }),
  downed: Object.freeze({ canMove: true, canJump: false, canUseWeapons: false, canRescue: false, maximumSpeed: PLAYER_LIFE_CONTROL_CONFIG.downedSpeed }),
  eliminated: Object.freeze({ canMove: false, canJump: false, canUseWeapons: false, canRescue: false, maximumSpeed: 0 }),
  respawning: Object.freeze({ canMove: false, canJump: false, canUseWeapons: false, canRescue: false, maximumSpeed: 0 }),
});
/** Authoritative life state selects allowed intent; view rotation remains independent. */
export function playerActionPolicy(status: PlayerLifeStatus): PlayerActionPolicy {
  if (!PLAYER_LIFE_STATUSES.includes(status)) throw new TypeError('Invalid life status for actions');
  return policies[status];
}
