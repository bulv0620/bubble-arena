import { Ball, Capsule, Ray, type World } from '@dimforge/rapier3d-compat';
import { ARENA_BOT_CONFIG, BUBBLE_TRAP_CONFIG, HIT_MAP_CLEARANCE, BLOCK_AVATAR_CONFIG as avatar, WEAPON_CONFIGS, WEAPON_DAMAGE_PROFILES, type RescuePosition } from '@bubble-arena/shared';
import { calculateWeaponDamage, spreadDirection } from '@bubble-arena/game-core';
import { queryScreenAimTarget } from '../weapons/screenAimRay';
const head = new Ball(avatar.headRadius), body = new Capsule(avatar.bodyHalfHeight, avatar.bodyRadius), identity = { x: 0, y: 0, z: 0, w: 1 };
/** Same head/body dimensions as BlockAvatar, clipped to nearest actual static map hit. */
export function resolveArenaBotShot(world: World, origin: RescuePosition, direction: RescuePosition, victim: RescuePosition, bubbled = false) {
  const map = queryScreenAimTarget(world, { origin, direction, range: WEAPON_CONFIGS.rifle.range });
  if (!map) return null;
  const ray = new Ray(origin, map.direction);
  if(bubbled){
    const distance=new Ball(BUBBLE_TRAP_CONFIG.radius).castRay(ray,{x:victim.x,y:victim.y+BUBBLE_TRAP_CONFIG.centerY,z:victim.z},identity,map.distance,true);
    if(distance<0||distance>=map.distance-HIT_MAP_CLEARANCE)return null;
    return {region:'body' as const,distance,damage:calculateWeaponDamage(WEAPON_CONFIGS.rifle.damage,WEAPON_DAMAGE_PROFILES.rifle,'body',distance),point:{x:origin.x+map.direction.x*distance,y:origin.y+map.direction.y*distance,z:origin.z+map.direction.z*distance}};
  }
  const regions = [
    { region: 'head' as const, distance: head.castRay(ray, { ...victim, y: victim.y + avatar.headY }, identity, map.distance, true) },
    { region: 'body' as const, distance: body.castRay(ray, { ...victim, y: victim.y + avatar.bodyY }, identity, map.distance, true) },
  ].filter(hit => hit.distance >= 0 && hit.distance < map.distance - HIT_MAP_CLEARANCE).sort((a, b) => a.distance - b.distance);
  const hit = regions[0];
  return hit ? { ...hit, damage: calculateWeaponDamage(WEAPON_CONFIGS.rifle.damage, WEAPON_DAMAGE_PROFILES.rifle, hit.region, hit.distance),
    point: { x: origin.x + map.direction.x * hit.distance, y: origin.y + map.direction.y * hit.distance, z: origin.z + map.direction.z * hit.distance } } : null;
}

export function arenaBotAim(origin: RescuePosition, victim: RescuePosition, sequence: number) {
  return spreadDirection({ x: victim.x - origin.x, y: victim.y + .15 - origin.y, z: victim.z - origin.z },
    ARENA_BOT_CONFIG.spreadDegrees * Math.PI / 180, (.2 + sequence * .61803398875 % .8) ** 2, sequence * .38196601125 % 1);
}
