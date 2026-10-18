import { Ray, QueryFilterFlags, type World } from '@dimforge/rapier3d-compat';
import { BUBBLE_CONFIG, COLLISION_GROUPS, HIT_MAP_CLEARANCE, WEAPON_CONFIGS, WEAPON_DAMAGE_PROFILES, WEAPON_HANDLING, type WeaponId, type HitRegion } from '@bubble-arena/shared';
import { calculateWeaponDamage, type BulletContact, type TrainingHit } from '@bubble-arena/game-core';
import { queryScreenAimTarget, type ScreenAimRay, type ScreenAimTarget } from './screenAimRay';
import type { MuzzleRayResult } from './muzzleRay';
import { traceBallisticRay } from './ballisticRay';
import type { PelletVisual } from '../effects/ShotFeedback';
export interface HitReceiver { receiveHit(hit: TrainingHit, damage?: number): boolean; applySlow(): void; isTargetable?: () => boolean }
const flags = QueryFilterFlags.EXCLUDE_DYNAMIC;
// Keep coincident target/map surfaces on the safe map side despite float quantization.
const mapMargin = HIT_MAP_CLEARANCE;

/** Owns registration only; R3F owns and removes the sensor/collider. */
export class TrainingTargets {
  private lastShotSequence = 0;
  private lastShotTick = -1;
  private hitSequence = 0;
  private explosions = new Set<number>();
  private newestExplosion = 0;
  dispose() { this.entries.clear(); this.explosions.clear(); }
  isRegistered = (handle: number) => { const entry = this.entries.get(handle); return Boolean(entry && (entry.enabled?.() ?? true) && (entry.target.isTargetable?.() ?? true)); };
  private entries = new Map<number, { target: HitReceiver; region: HitRegion; kind: 'person' | 'bubble'; enabled?: () => boolean }>();
  register(handle: number, target: HitReceiver, region: HitRegion = 'body', enabled?: () => boolean, kind: 'person' | 'bubble' = 'person') {
    if (!Number.isFinite(handle) || handle < 0 || this.entries.has(handle) || region !== 'head' && region !== 'body' || enabled !== undefined && typeof enabled !== 'function' || kind !== 'person' && kind !== 'bubble') throw new TypeError('Invalid/duplicate target collider or region');
    this.entries.set(handle, { target, region, enabled, kind });
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
      undefined, undefined, collider => { const entry = this.entries.get(collider.handle); return Boolean(entry && (entry.enabled?.() ?? true) && (entry.target.isTargetable?.() ?? true)); });
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
  receiveShotImpact(world: World, shot: TrainingHit, result: MuzzleRayResult | null, weapon: WeaponId = 'rifle') {
    return this.receiveVolley(world, shot, [result], weapon);
  }
  /** One accepted shot identity; each target receives its summed pellets exactly once. */
  receiveVolley(world: World, shot: TrainingHit, results: readonly (MuzzleRayResult | null)[], weapon: WeaponId) {
    return this.resolveVolley(world, shot, results, weapon).impact;
  }
  resolveVolley(world: World, shot: TrainingHit, results: readonly (MuzzleRayResult | null)[], weapon: WeaponId) {
    if (!shot || !Number.isSafeInteger(shot.tick) || shot.tick < 0 || !Number.isSafeInteger(shot.sequence) || shot.sequence <= 0
      || !WEAPON_CONFIGS[weapon] || !Array.isArray(results) || results.length !== WEAPON_HANDLING[weapon].pellets) throw new TypeError('Invalid local shot/volley');
    if (shot.sequence <= this.lastShotSequence || shot.tick < this.lastShotTick) return { impact: null, pellets: [] };
    this.lastShotSequence = shot.sequence; this.lastShotTick = shot.tick;
    const damageByTarget = new Map<HitReceiver, { damage: number; point: ScreenAimTarget['point'] }>();
    const pellets: PelletVisual[] = [];
    for (const result of results) {
      if (!result || result.status === 'blocked-muzzle') continue;
      const range = WEAPON_CONFIGS[weapon].range;
      if (![result.origin.x, result.origin.y, result.origin.z, result.direction.x, result.direction.y, result.direction.z].every(Number.isFinite)) continue;
      const length = Math.hypot(result.direction.x, result.direction.y, result.direction.z);
      if (!Number.isFinite(length) || length <= 0) continue;
      const direction = { x: result.direction.x / length, y: result.direction.y / length, z: result.direction.z / length };
      const contacts: BulletContact<HitReceiver>[] = [];
      // Query each collider once, then core deduplicates overlapping head/body by receiver.
      world.intersectionsWithRay(new Ray(result.origin, direction), range, true, hit => {
        const entry = this.entries.get(hit.collider.handle);
        if (entry && (entry.enabled?.() ?? true) && (entry.target.isTargetable?.() ?? true))
          contacts.push({ kind: entry.kind, target: entry.target, region: entry.region, distance: hit.timeOfImpact });
        return true;
      }, flags, COLLISION_GROUPS.targetQuery, undefined, undefined, c => this.isRegistered(c.handle));
      const trace = traceBallisticRay(world, { origin: result.origin, direction, range }, weapon, contacts);
      if (!trace) continue;
      pellets.push({ point: trace.point, hit: trace.stopped, contacts: trace.impactPoints });
      for (const { contact, multiplier } of trace.hits) {
        const damage = calculateWeaponDamage(WEAPON_CONFIGS[weapon].damage, WEAPON_DAMAGE_PROFILES[weapon], contact.region, contact.distance, multiplier);
        const hitPoint = { x: result.origin.x + direction.x * contact.distance, y: result.origin.y + direction.y * contact.distance, z: result.origin.z + direction.z * contact.distance };
        const previous = damageByTarget.get(contact.target);
        damageByTarget.set(contact.target, { damage: (previous?.damage ?? 0) + damage, point: previous?.point ?? hitPoint });
        if (import.meta.env.DEV) console.info('[damage.check]', JSON.stringify({ ...shot, weapon, region: contact.region, distance: contact.distance, penetration: multiplier, damage }));
      }
    }
    let point: ScreenAimTarget['point'] | null = null;
    const resolved = { tick: shot.tick, sequence: ++this.hitSequence };
    for (const [target, hit] of damageByTarget) if (target.receiveHit(resolved, hit.damage)) point ??= hit.point;
    return { impact: point, pellets: Object.freeze(pellets) };
  }
  /** Arrival order differs from emission order; assign a separate monotonic hit identity. */
  receiveExplosion(world: World, shot: TrainingHit, point: ScreenAimTarget['point'], controlAllowed = true) {
    if (typeof controlAllowed !== 'boolean') throw new TypeError('Invalid bubble control gate');
    if (!shot || !Number.isSafeInteger(shot.sequence) || shot.sequence <= 0 || !Number.isSafeInteger(shot.tick) || shot.tick < 0
      || !point || ![point.x, point.y, point.z].every(Number.isFinite)) throw new TypeError('Invalid bubble impact');
    if (this.explosions.has(shot.sequence) || shot.sequence <= this.newestExplosion - 64) return 0;
    this.newestExplosion = Math.max(this.newestExplosion, shot.sequence);
    this.explosions.add(shot.sequence);
    for (const sequence of this.explosions) if (sequence <= this.newestExplosion - 64) this.explosions.delete(sequence);
    const visible = new Set<HitReceiver>();
    for (const [handle, { target, enabled }] of this.entries) {
      if (enabled && !enabled() || visible.has(target) || target.isTargetable && !target.isTargetable()) continue;
      const collider = world.getCollider(handle);
      if (!collider) continue;
      const projection = collider.projectPoint(point, true);
      if (!projection) continue;
      const closest = projection.point;
      const direction = { x: closest.x - point.x, y: closest.y - point.y, z: closest.z - point.z };
      const distance = Math.hypot(direction.x, direction.y, direction.z);
      if (distance > BUBBLE_CONFIG.explosionRadius) continue;
      const obstruction = distance > 1e-6 ? queryScreenAimTarget(world, { origin: point, direction, range: distance }) : null;
      if (distance > 1e-6 && (!obstruction || obstruction.status === 'hit' && obstruction.distance + mapMargin < distance)) continue;
      visible.add(target);
    }
    const resolved = { tick: shot.tick, sequence: ++this.hitSequence };
    let hits = 0;
    for (const target of visible) if (target.receiveHit(resolved, WEAPON_CONFIGS.bubble.damage)) { if (controlAllowed) target.applySlow(); hits++; }
    if (import.meta.env.DEV) console.info('[bubble.impact]', JSON.stringify({ ...shot, point, hits }));
    return hits;
  }

}
