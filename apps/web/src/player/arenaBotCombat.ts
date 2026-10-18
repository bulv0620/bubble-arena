import type { World } from '@dimforge/rapier3d-compat';
import { ARENA_BOT_CONFIG, WEAPON_CONFIGS, WEAPON_DAMAGE_PROFILES, type DamageActor, type RescuePosition, type PlayerLifeStatus } from '@bubble-arena/shared';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import { isRescueLineClear } from './rescueLineOfSight';
import { queryArenaVictim } from './arenaCombatRay';
import { calculateWeaponDamage, type BulletContact } from '@bubble-arena/game-core';
import { traceBallisticRay } from '../weapons/ballisticRay';
export interface ArenaCombatant {
  readonly actor: DamageActor; readonly position: RescuePosition; readonly status: PlayerLifeStatus;
  readonly receive: (damage: number, source: DamageActor) => boolean;
}
export function arenaCombatants(bots: readonly LocalArenaOpponent[], health: LocalPlayerHealth, player: RescuePosition): readonly ArenaCombatant[] {
  return [{ actor: health.actor, position: { x: player.x, y: player.y, z: player.z }, status: health.getSnapshot().status, receive: (d, s) => health.receiveCombatDamage(d, s) },
    ...bots.map(bot => ({ actor: bot.actor, position: bot.getPosition(), status: bot.getSnapshot().status, receive: (d: number, s: DamageActor) => bot.receiveCombatDamage(d, s) }))];
}
const alive = (c: ArenaCombatant) => c.status === 'normal' || c.status === 'downed';
/** Choose a visible enemy before applying range/reaction rules; never aim at an ally or through a map wall. */
export function selectArenaBotTarget(world: World, actor: DamageActor, origin: RescuePosition, candidates: readonly ArenaCombatant[]) {
  return candidates.filter(c => c.actor.teamId !== actor.teamId && alive(c))
    .map(c => ({ c, distance: Math.hypot(c.position.x-origin.x, c.position.z-origin.z) }))
    .filter(({ c, distance }) => distance <= ARENA_BOT_CONFIG.viewRange && isRescueLineClear(world, { x: origin.x, y: origin.y+.5, z: origin.z }, { x: c.position.x, y: c.position.y+.15, z: c.position.z }))
    .sort((a,b)=>a.distance-b.distance || a.c.actor.playerId.localeCompare(b.c.actor.playerId))[0]?.c ?? null;
}
/** Same material/character attenuation as player fire, with actor attribution for every hit. */
export function resolveArenaTeamShot(world: World, actor: DamageActor, origin: RescuePosition, direction: RescuePosition, candidates: readonly ArenaCombatant[]) {
  const contacts: BulletContact<ArenaCombatant>[] = [];
  for (const victim of candidates.filter(c => c.actor.playerId !== actor.playerId && alive(c) && (c.actor.teamId !== actor.teamId || c.status === 'downed'))) {
    const hit = queryArenaVictim(origin, direction, victim.position, victim.status === 'downed');
    if (hit) contacts.push({ kind: victim.status === 'downed' ? 'bubble' : 'person', target: victim, region: hit.region, distance: hit.distance });
  }
  const trace = traceBallisticRay(world, { origin, direction, range: WEAPON_CONFIGS.rifle.range }, 'rifle', contacts);
  if (!trace) return null;
  const hits = trace.hits.map(({ contact, multiplier }) => {
    if (contact.target.actor.teamId === actor.teamId) return { victim: contact.target, damage: 0, accepted: false };
    const damage = calculateWeaponDamage(WEAPON_CONFIGS.rifle.damage, WEAPON_DAMAGE_PROFILES.rifle, contact.region, contact.distance, multiplier);
    return { victim: contact.target, damage, accepted: contact.target.receive(damage, actor) };
  });
  return { hits, pellet: { point: trace.point, hit: trace.stopped, contacts: trace.impactPoints } };
}
