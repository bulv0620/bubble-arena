import { Capsule, QueryFilterFlags, Ray, type World } from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, PLAYER_CONFIG, RESPAWN_CONFIG, parseRescuePosition, type RescuePosition } from '@bubble-arena/shared';
const flags = QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS;
/** Existing map only: clear full capsule plus margin, and walkable support below. */
export function isSpawnClear(world: World, position: RescuePosition): boolean {
  const p = parseRescuePosition(position); let blocked = false;
  world.intersectionsWithShape(p, { x: 0, y: 0, z: 0, w: 1 }, new Capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius + RESPAWN_CONFIG.clearance),
    () => { blocked = true; return false; }, flags, COLLISION_GROUPS.player);
  if (blocked) return false;
  const support = world.castRayAndGetNormal(new Ray(p, { x: 0, y: -1, z: 0 }), PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance + RESPAWN_CONFIG.clearance, true, flags, COLLISION_GROUPS.player);
  return Boolean(support && support.normal.y >= Math.cos(PLAYER_CONFIG.maxSlopeAngle));
}
