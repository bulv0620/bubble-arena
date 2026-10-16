import type { World } from '@dimforge/rapier3d-compat';
import { ARENA_BOT_CONFIG, type DamageActor, type RescuePosition, type PlayerLifeStatus } from '@bubble-arena/shared';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import { isRescueLineClear } from './rescueLineOfSight';
import { resolveArenaBotShot } from './arenaCombatRay';
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
/** Resolve the nearest enemy along the accepted ray, rather than damaging the selected target through another enemy. */
export function resolveArenaTeamShot(world: World, actor: DamageActor, origin: RescuePosition, direction: RescuePosition, candidates: readonly ArenaCombatant[]) {
  const hits = candidates.filter(c => c.actor.teamId !== actor.teamId && alive(c)).map(victim => ({ victim, hit: resolveArenaBotShot(world, origin, direction, victim.position, victim.status==='downed') })).filter(e=>e.hit!==null).sort((a,b)=>a.hit!.distance-b.hit!.distance);
  const first = hits[0];
  return first?.hit ? { ...first.hit, victim: first.victim, accepted: first.victim.receive(first.hit.damage, actor) } : null;
}
