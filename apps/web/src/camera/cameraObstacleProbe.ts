import { Ball, QueryFilterFlags, type World, type Vector } from '@dimforge/rapier3d-compat';
import { CAMERA_CONFIG, COLLISION_GROUPS } from '@bubble-arena/shared';

export type CameraObstacleResult =
  | { status: 'invalid' }
  | { status: 'clear'; length: number }
  | { status: 'hit'; length: number; distance: number; colliderHandle: number };

// A JS shape description, not a collider/body registered in the physics world.
const sphere = new Ball(CAMERA_CONFIG.obstacleRadius);
const identity = { x: 0, y: 0, z: 0, w: 1 };

/** Sweeps from the shoulder focus to the ideal camera. Reads the world only. */
export function detectCameraObstacle(world: World, origin: Vector, ideal: Vector): CameraObstacleResult {
  if (![origin.x, origin.y, origin.z, ideal.x, ideal.y, ideal.z].every(Number.isFinite)) {
    return { status: 'invalid' };
  }
  const dx = ideal.x - origin.x, dy = ideal.y - origin.y, dz = ideal.z - origin.z;
  const length = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(length) || length <= 0) return { status: 'invalid' };
  // Unit velocity makes Rapier's time_of_impact a travelled distance in metres.
  const hit = world.castShape(origin, identity, { x: dx / length, y: dy / length, z: dz / length },
    sphere, CAMERA_CONFIG.obstacleClearance, length, true,
    QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS,
    COLLISION_GROUPS.player); // Existing mask sees map solids, not players or test cubes.
  if (!hit) return { status: 'clear', length };
  if (!Number.isFinite(hit.time_of_impact) || hit.time_of_impact < 0 || hit.time_of_impact > length) {
    return { status: 'invalid' };
  }
  return { status: 'hit', length, distance: hit.time_of_impact, colliderHandle: hit.collider.handle };
}
