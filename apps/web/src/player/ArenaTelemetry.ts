import { ARENA_SPAWNS, TEAM_VISION_CONFIG, type RescuePosition, type TeamId } from '@bubble-arena/shared';
import type { World } from '@dimforge/rapier3d-compat';
import { inTeamVision, type VisionActor } from './teamVision';
interface MapActor { readonly id: string; readonly team: TeamId; readonly position: RescuePosition }
export class ArenaTelemetry {
  private state: { readonly player: RescuePosition; readonly playerTeam: TeamId; readonly actors: readonly MapActor[] } = Object.freeze({ player: ARENA_SPAWNS.points[0].position, playerTeam: 'red', actors: Object.freeze([]) });
  private readonly listeners = new Set<() => void>();
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  update(tick: number, player: RescuePosition) {
    if (tick % TEAM_VISION_CONFIG.publishTicks) return;
    this.state = Object.freeze({ player: Object.freeze({ ...player }), playerTeam: 'red', actors: Object.freeze([]) }); this.notify();
  }
  updateSquad(tick: number, world: World, player: VisionActor, actors: readonly VisionActor[]) {
    if (tick % TEAM_VISION_CONFIG.publishTicks) return;
    const viewers = [player, ...actors.filter(a => a.team === player.team)];
    this.state = Object.freeze({ player: Object.freeze({ ...player.position }), playerTeam: player.team,
      actors: Object.freeze(actors.filter(a => ['normal', 'downed'].includes(a.status) && (a.team === player.team || inTeamVision(world, a, viewers)))
        .map(a => Object.freeze({ id: a.id, team: a.team, position: Object.freeze({ ...a.position }) }))) });
    this.notify();
  }
  private notify() { for (const listener of this.listeners) listener(); }
  dispose() { this.listeners.clear(); }
}
