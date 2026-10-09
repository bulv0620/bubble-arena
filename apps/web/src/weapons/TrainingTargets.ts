import { Ray, QueryFilterFlags, type World } from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, WEAPON_CONFIGS, WEAPON_DAMAGE_PROFILES, type HitRegion } from '@bubble-arena/shared';
import { calculateWeaponDamage, type TrainingHit } from '@bubble-arena/game-core';
import { queryScreenAimTarget, type ScreenAimRay, type ScreenAimTarget } from './screenAimRay';
import type { MuzzleRayResult } from './muzzleRay';
import type { LocalTrainingTarget } from './LocalTrainingTarget';
const flags = QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC;
// Keep coincident target/map surfaces on the safe map side despite float quantization.
const mapMargin = 0.00001;

/** Owns registration only; R3F owns and removes the sensor/collider. */
export class TrainingTargets {
  private lastShotSequence = 0;
  private lastShotTick = -1;
  private entries = new Map<number, { target: LocalTrainingTarget; region: HitRegion }>();
  register(handle: number, target: LocalTrainingTarget, region: HitRegion = 'body') {
    if (!Number.isFinite(handle) || handle < 0 || this.entries.has(handle) || region !== 'head' && region !== 'body') throw new TypeError('Invalid/duplicate target collider or region');
    this.entries.set(handle, { target, region });
    let active = true;
    return () => { if (active) { active = false; this.entries.delete(handle); } };
  }
  private query(world: World, ray: ScreenAimRay) {
    if (!ray || !ray.origin || !ray.direction || ![ray.origin.x, ray.origin.y, ray.origin.z,
      ray.direction.x, ray.direction.y, ray.direction.z, ray.range].every(Number.isFinite) || ray.range <= 0) return null;
    const len = Math.hypot(ray.direction.x, ray.direction.y, ray.direction.z);
    if (!Number.isFinite(len) || len === 0) return null;
    const direction = { x: ray.direction.x / len, y: ray.direction.y / len, z: ray.direction.z / len };
    const hit = world.castRay(new Ray(ray.origin, direction), ray.range, true, flags, COLLISION_GROUPS.targetQuery,
      undefined, undefined, collider => this.entries.has(collider.handle));
    if (!hit || !Number.isFinite(hit.timeOfImpact) || hit.timeOfImpact < 0 || hit.timeOfImpact > ray.range) return null;
    const point = Object.freeze({ x: ray.origin.x + direction.x * hit.timeOfImpact,
      y: ray.origin.y + direction.y * hit.timeOfImpact, z: ray.origin.z + direction.z * hit.timeOfImpact });
    if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
    return { handle: hit.collider.handle, distance: hit.timeOfImpact, point };
  }
  aim(world: World, ray: ScreenAimRay): ScreenAimTarget | null {
    const map = queryScreenAimTarget(world, ray);
    if (!map) return null;
    const hit = this.query(world, { ...ray, range: map.distance });
    if (!hit || map.status === 'hit' && hit.distance + mapMargin >= map.distance) return map;
    return Object.freeze({ ...map, status: 'hit', point: hit.point, distance: hit.distance, colliderHandle: hit.handle });
  }
  receiveShot(world: World, shot: TrainingHit, result: MuzzleRayResult | null) {
    return this.receiveShotImpact(world, shot, result) !== null;
  }
  receiveShotImpact(world: World, shot: TrainingHit, result: MuzzleRayResult | null) {
    if (!shot || !Number.isSafeInteger(shot.tick) || shot.tick < 0 || !Number.isSafeInteger(shot.sequence) || shot.sequence <= 0) throw new TypeError('Invalid local shot identity');
    if (shot.sequence <= this.lastShotSequence || shot.tick < this.lastShotTick) return null;
    this.lastShotSequence = shot.sequence; this.lastShotTick = shot.tick;
    if (!result || result.status === 'blocked-muzzle') return null;
    const hit = this.query(world, { origin: result.origin, direction: result.direction, range: Math.min(result.distance, WEAPON_CONFIGS.rifle.range) });
    if (!hit || result.status === 'hit' && hit.distance + mapMargin >= result.distance) return null;
    const entry = this.entries.get(hit.handle);
    if (!entry) return null;
    const damage = calculateWeaponDamage(WEAPON_CONFIGS.rifle.damage, WEAPON_DAMAGE_PROFILES.rifle, entry.region, hit.distance);
    const accepted = entry.target.receiveHit(shot, damage);
    if (accepted && import.meta.env.DEV) console.info('[damage.check]', JSON.stringify({ ...shot, region: entry.region,
      distance: hit.distance, damage, appliedDamage: entry.target.getSnapshot().lastDamage }));
    return accepted ? hit.point : null;
  }
}
