import { QueryFilterFlags, Ray, type World } from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, WEAPON_CONFIGS, type WeaponId } from '@bubble-arena/shared';
import { resolveBulletPenetration, type BulletContact } from '@bubble-arena/game-core';
import type { ScreenAimRay } from './screenAimRay';

const flags = QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS;
/** Read live Rapier map material and authority target contacts along the full muzzle ray. */
export function traceBallisticRay<T>(world: World, ray: ScreenAimRay, weapon: WeaponId, targets: readonly BulletContact<T>[]) {
  const length = Math.hypot(ray.direction.x, ray.direction.y, ray.direction.z);
  if (![ray.origin.x, ray.origin.y, ray.origin.z, length, ray.range].every(Number.isFinite) || length <= 0 || ray.range <= 0) return null;
  const range = Math.min(ray.range, WEAPON_CONFIGS[weapon].range);
  const direction = { x: ray.direction.x / length, y: ray.direction.y / length, z: ray.direction.z / length };
  const contacts = [...targets], physicsRay = new Ray(ray.origin, direction);
  world.intersectionsWithRay(physicsRay, range, true, hit => {
    const data = hit.collider.parent()?.userData as { bulletMaterial?: unknown } | undefined;
    contacts.push({ kind: data?.bulletMaterial === 'wood' ? 'wood' : 'solid', key: hit.collider.handle, distance: hit.timeOfImpact });
    return true;
  }, flags, COLLISION_GROUPS.player);
  const resolved = resolveBulletPenetration(weapon, range, contacts);
  const pointAt = (distance: number) => Object.freeze({ x: ray.origin.x + direction.x * distance,
    y: ray.origin.y + direction.y * distance, z: ray.origin.z + direction.z * distance });
  return { ...resolved, point: pointAt(resolved.distance), impactPoints: resolved.impacts.map(c => pointAt(c.distance)) };
}
