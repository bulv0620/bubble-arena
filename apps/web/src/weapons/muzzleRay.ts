import type { World } from '@dimforge/rapier3d-compat';
import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import { queryScreenAimTarget, type AimVector, type ScreenAimTarget } from './screenAimRay';

export interface MuzzleRayResult {
  readonly status: 'hit' | 'clear' | 'blocked-muzzle';
  readonly origin: AimVector;
  readonly direction: AimVector;
  readonly point: AimVector;
  /** Travel from origin; for blocked-muzzle origin is the safety anchor. */
  readonly distance: number;
  readonly colliderHandle: number | null;
}
const finite = (v: AimVector) => Boolean(v && [v.x, v.y, v.z].every(Number.isFinite));

/** Read-only map query. Prevents a protruding muzzle from starting on the far side of a wall. */
export function queryMuzzleRay(world: World, anchor: AimVector, muzzle: AimVector, target: ScreenAimTarget,
  range = WEAPON_CONFIGS.rifle.range, shotDirection?: AimVector): MuzzleRayResult | null {
  if (!finite(anchor) || !finite(muzzle) || !target || !finite(target.point) || !Number.isFinite(range) || range <= 0) return null;
  const guard = { x: muzzle.x - anchor.x, y: muzzle.y - anchor.y, z: muzzle.z - anchor.z };
  const guardLength = Math.hypot(guard.x, guard.y, guard.z);
  if (!Number.isFinite(guardLength) || guardLength <= 0) return null;
  const obstruction = queryScreenAimTarget(world, { origin: anchor, direction: guard, range: guardLength });
  if (!obstruction) return null;
  if (obstruction.status === 'hit') return Object.freeze({ status: 'blocked-muzzle', origin: obstruction.origin,
    direction: obstruction.direction, point: obstruction.point, distance: obstruction.distance, colliderHandle: obstruction.colliderHandle });
  const direction = { x: target.point.x - muzzle.x, y: target.point.y - muzzle.y, z: target.point.z - muzzle.z };
  const actual = queryScreenAimTarget(world, { origin: muzzle, direction: shotDirection ?? direction, range });
  if (!actual) return null;
  return Object.freeze({ status: actual.status, origin: actual.origin, direction: actual.direction,
    point: actual.point, distance: actual.distance, colliderHandle: actual.colliderHandle });
}
