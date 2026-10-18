import { BLOCK_AVATAR_CONFIG, PLAYER_CONFIG, type WeaponId } from '@bubble-arena/shared';
import type { AimVector } from './screenAimRay';

/** Engineering placeholder dimensions only; formal Blender muzzle socket replaces this later. */
export const RIFLE_PLACEHOLDER_POSE = Object.freeze({
  socket: Object.freeze({ x: PLAYER_CONFIG.radius + 0.1, y: BLOCK_AVATAR_CONFIG.headY - BLOCK_AVATAR_CONFIG.headRadius, z: -0.08 }),
  front: Object.freeze({ y: 0.15, z: 0.58, depth: 0.02 }),
});
export const WEAPON_PLACEHOLDER_SCALE = Object.freeze({ rifle: 1, shotgun: .8, sniper: 1.5, bubble: .55 });
/** Static body-forward pose. Hit points and camera pitch never change the held gun. */
export function rifleMuzzlePosition(center: AimVector, yaw: number, weapon: WeaponId = 'rifle'): AimVector | null {
  if (!center || ![center.x, center.y, center.z, yaw].every(Number.isFinite)) return null;
  const scale = WEAPON_PLACEHOLDER_SCALE[weapon];
  if (!scale) return null;
  const { socket, front } = RIFLE_PLACEHOLDER_POSE;
  const z = socket.z - (front.z + front.depth / 2) * scale;
  const muzzle = { x: center.x + socket.x * Math.cos(yaw) + z * Math.sin(yaw),
    y: center.y + socket.y + front.y, z: center.z - socket.x * Math.sin(yaw) + z * Math.cos(yaw) };
  return [muzzle.x, muzzle.y, muzzle.z].every(Number.isFinite) ? Object.freeze(muzzle) : null;
}
