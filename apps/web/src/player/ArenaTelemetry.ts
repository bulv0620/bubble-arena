import { ARENA_SPAWNS, type RescuePosition } from '@bubble-arena/shared';
export class ArenaTelemetry {
  private state = Object.freeze({ player: ARENA_SPAWNS.points[0].position, enemy: ARENA_SPAWNS.points[4].position });
  private readonly listeners = new Set<() => void>();
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  update(tick: number, player: RescuePosition, enemy: RescuePosition) { if (tick % 6) return; this.state = Object.freeze({ player: Object.freeze({ ...player }), enemy: Object.freeze({ ...enemy }) }); for (const listener of this.listeners) listener(); }
  dispose() { this.listeners.clear(); }
}
