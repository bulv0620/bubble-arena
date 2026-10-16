import type { World } from '@dimforge/rapier3d-compat';
import { BLOCK_AVATAR_CONFIG, type PlayerLifeStatus, type RescuePosition } from '@bubble-arena/shared';
import { isRescueLineClear } from '../player/rescueLineOfSight';

/** A label above a wall is not evidence that its owner can be seen. Map collision only. */
export function isOpponentHealthVisible(world: World, eye: RescuePosition, center: RescuePosition, status: PlayerLifeStatus) {
  if (status !== 'normal' && status !== 'downed' || ![eye.x, eye.y, eye.z, center.x, center.y, center.z].every(Number.isFinite)) return false;
  // Normalize Three/Rapier vectors before crossing the strict shared-data boundary.
  const origin = { x: eye.x, y: eye.y, z: eye.z };
  return [BLOCK_AVATAR_CONFIG.headY, BLOCK_AVATAR_CONFIG.bodyY].some(offset =>
    isRescueLineClear(world, origin, { x: center.x, y: center.y + offset, z: center.z }));
}
