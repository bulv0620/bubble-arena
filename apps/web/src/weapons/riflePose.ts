import { PLAYER_CONFIG } from '@bubble-arena/shared';
import type { AimVector } from './screenAimRay';

/** Engineering placeholder dimensions only; formal Blender muzzle socket replaces this later. */
export const RIFLE_PLACEHOLDER_POSE = Object.freeze({
  socket: Object.freeze({ x: PLAYER_CONFIG.radius + 0.1, y: 0.2, z: -0.08 }),
  front: Object.freeze({ y: 0.15, z: 0.58, depth: 0.02 }),
});
export function rifleMuzzlePosition(center: AimVector, yaw: number): AimVector | null {
  if (!center || ![center.x, center.y, center.z, yaw].every(Number.isFinite)) return null;
  const { socket, front } = RIFLE_PLACEHOLDER_POSE;
  // Socket rotation PI maps asset +Z to whitebox -Z, then facing yaw rotates the whole visual.
  const x = socket.x, z = socket.z - front.z - front.depth / 2;
  const result = { x: center.x + x * Math.cos(yaw) + z * Math.sin(yaw),
    y: center.y + socket.y + front.y, z: center.z - x * Math.sin(yaw) + z * Math.cos(yaw) };
  return [result.x, result.y, result.z].every(Number.isFinite) ? Object.freeze(result) : null;
}
