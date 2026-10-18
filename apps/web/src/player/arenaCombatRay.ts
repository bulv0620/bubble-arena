import { Ball, Capsule, Ray, type World } from '@dimforge/rapier3d-compat';
import { ARENA_BOT_CONFIG, BUBBLE_TRAP_CONFIG, BLOCK_AVATAR_CONFIG as avatar, WEAPON_CONFIGS, WEAPON_DAMAGE_PROFILES, type RescuePosition } from '@bubble-arena/shared';
import { calculateWeaponDamage, spreadDirection } from '@bubble-arena/game-core';
import { traceBallisticRay } from '../weapons/ballisticRay';
const head = new Ball(avatar.headRadius), body = new Capsule(avatar.bodyHalfHeight, avatar.bodyRadius), identity = { x: 0, y: 0, z: 0, w: 1 };
/** Analytic authority hit volumes; map clipping/penetration is shared with player rays. */
export function queryArenaVictim(origin: RescuePosition, direction: RescuePosition, victim: RescuePosition, bubbled = false) {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (![origin.x, origin.y, origin.z, length, victim.x, victim.y, victim.z].every(Number.isFinite) || length <= 0) return null;
  const unit = { x: direction.x / length, y: direction.y / length, z: direction.z / length }, ray = new Ray(origin, unit), range = WEAPON_CONFIGS.rifle.range;
  const regions = bubbled ? [{ region: 'body' as const, distance: new Ball(BUBBLE_TRAP_CONFIG.radius).castRay(ray,
    { x: victim.x, y: victim.y + BUBBLE_TRAP_CONFIG.centerY, z: victim.z }, identity, range, true) }] : [
    { region: 'head' as const, distance: head.castRay(ray, { ...victim, y: victim.y + avatar.headY }, identity, range, true) },
    { region: 'body' as const, distance: body.castRay(ray, { ...victim, y: victim.y + avatar.bodyY }, identity, range, true) },
  ];
  const hit = regions.filter(h => h.distance >= 0 && h.distance <= range).sort((a, b) => a.distance - b.distance)[0];
  return hit ? { ...hit, point: { x: origin.x + unit.x * hit.distance, y: origin.y + unit.y * hit.distance, z: origin.z + unit.z * hit.distance } } : null;
}
export function resolveArenaBotShot(world: World, origin: RescuePosition, direction: RescuePosition, victim: RescuePosition, bubbled = false) {
  const hit = queryArenaVictim(origin, direction, victim, bubbled);
  if (!hit) return null;
  const trace = traceBallisticRay(world, { origin, direction, range: WEAPON_CONFIGS.rifle.range }, 'rifle', [{ kind: bubbled ? 'bubble' : 'person', target: victim, ...hit }]);
  const resolved = trace?.hits[0];
  return resolved ? { ...hit, damage: calculateWeaponDamage(WEAPON_CONFIGS.rifle.damage, WEAPON_DAMAGE_PROFILES.rifle, hit.region, hit.distance, resolved.multiplier) } : null;
}

export function arenaBotAim(origin: RescuePosition, victim: RescuePosition, sequence: number) {
  return spreadDirection({ x: victim.x - origin.x, y: victim.y + .15 - origin.y, z: victim.z - origin.z },
    ARENA_BOT_CONFIG.spreadDegrees * Math.PI / 180, (.2 + sequence * .61803398875 % .8) ** 2, sequence * .38196601125 % 1);
}
