import { QueryFilterFlags, Ray, type World } from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, parseRescuePosition, type RescuePosition } from '@bubble-arena/shared';
const flags = QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS;

/** Centre-to-centre map query for rescue eligibility. Reads existing collision
 * only; characters, target sensors and visual effects cannot occlude rescue. */
export function isRescueLineClear(world: World, from: RescuePosition, to: RescuePosition): boolean {
  const origin = parseRescuePosition(from), end = parseRescuePosition(to);
  const dx = end.x - origin.x, dy = end.y - origin.y, dz = end.z - origin.z, length = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(length)) return false;
  if (length === 0) {
    let blocked = false;
    world.intersectionsWithPoint(origin, () => { blocked = true; return false; }, flags, COLLISION_GROUPS.player);
    return !blocked;
  }
  const hit = world.castRay(new Ray(origin, { x: dx / length, y: dy / length, z: dz / length }), length, true, flags, COLLISION_GROUPS.player);
  return hit === null;
}
