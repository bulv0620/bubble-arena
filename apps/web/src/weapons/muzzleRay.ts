import type { World } from '@dimforge/rapier3d-compat';
import { HIT_MAP_CLEARANCE, WEAPON_CONFIGS } from '@bubble-arena/shared';
import { queryScreenAimTarget, type AimVector, type ScreenAimTarget } from './screenAimRay';

export interface MuzzleRayResult {
  readonly status: 'hit' | 'clear' | 'blocked-muzzle';
  readonly origin: AimVector;
  readonly direction: AimVector;
  readonly point: AimVector;
  /** Travel from origin; safety-segment rejection starts at the body anchor. */
  readonly distance: number;
  readonly colliderHandle: number | null;
  /** The physical gun hits cover before reaching the camera-selected point. */
  readonly aimObstructed?: boolean;
}
const finite = (v: AimVector) => Boolean(v && [v.x, v.y, v.z].every(Number.isFinite));
const copy = (v: AimVector): AimVector => Object.freeze({ x: v.x, y: v.y, z: v.z });

/** Camera selects a point; the actual bullet direction belongs to the physical muzzle. */
export function muzzleAimDirection(muzzle: AimVector, target: ScreenAimTarget): AimVector | null {
  if (!finite(muzzle) || !target || !finite(target.origin) || !finite(target.point) || !finite(target.direction)
    || !Number.isFinite(target.range) || target.range <= 0) return null;
  const length = Math.hypot(target.direction.x, target.direction.y, target.direction.z);
  if (!Number.isFinite(length) || length <= 0) return null;
  const forward = { x: target.direction.x / length, y: target.direction.y / length, z: target.direction.z / length };
  const delta = { x: target.point.x-muzzle.x, y: target.point.y-muzzle.y, z: target.point.z-muzzle.z };
  const distance = Math.hypot(delta.x,delta.y,delta.z);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  if (delta.x*forward.x+delta.y*forward.y+delta.z*forward.z <= .05) return Object.freeze(forward);
  return Object.freeze({x:delta.x/distance,y:delta.y/distance,z:delta.z/distance});
}

/** Two-stage aiming: camera reference, then physical muzzle collision and penetration path. */
export function queryMuzzleRay(world: World, anchor: AimVector, muzzle: AimVector, target: ScreenAimTarget,
  range = WEAPON_CONFIGS.rifle.range, shotDirection?: AimVector): MuzzleRayResult | null {
  if (!finite(anchor) || !finite(muzzle) || !target || !finite(target.origin) || !finite(target.point) || !finite(target.direction)
    || !Number.isFinite(target.range) || target.range<=0 || !Number.isFinite(range) || range <= 0) return null;
  const forwardLength = Math.hypot(target.direction.x,target.direction.y,target.direction.z);
  if (!Number.isFinite(forwardLength) || forwardLength<=0) return null;
  const guard = { x: muzzle.x-anchor.x, y: muzzle.y-anchor.y, z: muzzle.z-anchor.z };
  const guardLength = Math.hypot(guard.x,guard.y,guard.z);
  if (!Number.isFinite(guardLength) || guardLength <= 0) return null;
  const obstruction = queryScreenAimTarget(world,{origin:anchor,direction:guard,range:guardLength});
  if (!obstruction) return null;
  if (obstruction.status === 'hit') return Object.freeze({status:'blocked-muzzle',origin:obstruction.origin,
    direction:obstruction.direction,point:obstruction.point,distance:obstruction.distance,colliderHandle:obstruction.colliderHandle,aimObstructed:true});
  const direction = muzzleAimDirection(muzzle,target);
  if (!direction) return null;
  const delta = {x:target.point.x-muzzle.x,y:target.point.y-muzzle.y,z:target.point.z-muzzle.z};
  const goalDistance = Math.hypot(delta.x,delta.y,delta.z);
  if (!Number.isFinite(goalDistance)) return null;
  // Camera-side or almost coincident targets must not produce backwards shots.
  if ((delta.x*target.direction.x+delta.y*target.direction.y+delta.z*target.direction.z)/forwardLength <= .05)
    return Object.freeze({status:'blocked-muzzle',origin:copy(muzzle),direction,point:copy(muzzle),distance:0,colliderHandle:target.colliderHandle,aimObstructed:true});
  const actual = queryScreenAimTarget(world,{origin:muzzle,direction:shotDirection??direction,range});
  if (!actual) return null;
  return Object.freeze({status:actual.status,origin:actual.origin,direction:actual.direction,point:actual.point,
    distance:actual.distance,colliderHandle:actual.colliderHandle,
    aimObstructed:actual.status==='hit' && actual.distance+HIT_MAP_CLEARANCE<goalDistance});
}
