import { QueryFilterFlags, Ray, type World } from '@dimforge/rapier3d-compat';
import { PerspectiveCamera, Vector3 } from 'three';
import { COLLISION_GROUPS, WEAPON_CONFIGS } from '@bubble-arena/shared';

export interface AimVector { readonly x: number; readonly y: number; readonly z: number }
export interface ScreenAimRay { readonly origin: AimVector; readonly direction: AimVector; readonly range: number }
export interface ScreenAimTarget extends ScreenAimRay {
  readonly status: 'hit' | 'clear';
  readonly point: AimVector;
  readonly distance: number;
  readonly colliderHandle: number | null;
}
const finite = (v: AimVector) => Boolean(v && [v.x, v.y, v.z].every(Number.isFinite));
const copy = (v: AimVector): AimVector => Object.freeze({ x: v.x, y: v.y, z: v.z });
const flags = QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS;

/** Perspective centre is camera world forward, independent of FOV/aspect/shoulder offset. */
export function createScreenAimRay(camera: PerspectiveCamera, range = WEAPON_CONFIGS.rifle.range): ScreenAimRay | null {
  if (!(camera instanceof PerspectiveCamera) || ![camera.fov, camera.aspect, camera.near, camera.far].every(Number.isFinite)
    || camera.fov <= 0 || camera.fov >= 180 || camera.aspect <= 0 || camera.near <= 0 || camera.far <= camera.near
    || !Number.isFinite(range) || range <= 0 || ![camera.quaternion.x, camera.quaternion.y,
    camera.quaternion.z, camera.quaternion.w].every(Number.isFinite) || camera.quaternion.lengthSq() === 0) return null;
  const origin = camera.getWorldPosition(new Vector3()), direction = camera.getWorldDirection(new Vector3());
  if (!finite(origin) || !finite(direction) || direction.lengthSq() === 0) return null;
  return Object.freeze({ origin: copy(origin), direction: copy(direction.normalize()), range });
}

/** Local aiming reference only. Reads map collision; never applies damage or consumes ammo. */
export function queryScreenAimTarget(world: World, ray: ScreenAimRay): ScreenAimTarget | null {
  if (!ray || !finite(ray.origin) || !finite(ray.direction) || !Number.isFinite(ray.range) || ray.range <= 0) return null;
  const length = Math.hypot(ray.direction.x, ray.direction.y, ray.direction.z);
  if (!Number.isFinite(length) || length <= 0) return null;
  const origin = copy(ray.origin), direction = copy({ x: ray.direction.x / length,
    y: ray.direction.y / length, z: ray.direction.z / length });
  const hit = world.castRay(new Ray(origin, direction), ray.range, true, flags, COLLISION_GROUPS.player);
  const distance = hit ? hit.timeOfImpact : ray.range;
  if (!Number.isFinite(distance) || distance < 0 || distance > ray.range) return null;
  const point = copy({ x: origin.x + direction.x * distance, y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance });
  if (!finite(point)) return null;
  return Object.freeze({ origin, direction, range: ray.range, status: hit ? 'hit' : 'clear',
    point, distance, colliderHandle: hit?.collider.handle ?? null });
}
