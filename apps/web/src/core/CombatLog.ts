import { PHYSICS_CONFIG, parseDamageActor, type DamageActor, type EliminationFact } from '@bubble-arena/shared';
import type { PlayerHealthSnapshot } from '@bubble-arena/game-core';

export interface CombatEvent {
  readonly id: number; readonly tick: number; readonly kind: 'downed' | 'eliminated';
  readonly actor: DamageActor | null; readonly victim: DamageActor; readonly lifeId: number;
}
interface HealthSource {
  getSnapshot(): PlayerHealthSnapshot; getDowner(): DamageActor | null; getElimination(): EliminationFact | null; getTick(): number;
  subscribe(listener: () => void): () => void;
}
export const COMBAT_LOG_CONFIG = Object.freeze({ capacity: 6, lifetimeTicks: 6 * PHYSICS_CONFIG.tickRate });
/** Presentation projection of accepted life transitions; never consumes scoring facts. */
export class CombatLog {
  private state: readonly CombatEvent[] = Object.freeze([]);
  private sequence = 0;
  private tick = 0;
  private disposed = false;
  private readonly listeners = new Set<() => void>();
  private readonly releases: (() => void)[] = [];
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { if (this.disposed) return () => {}; this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(events: readonly CombatEvent[]) { this.state = Object.freeze(events); for (const listener of this.listeners) listener(); }
  bind(source: HealthSource, owner: DamageActor) {
    if (this.disposed) return;
    const victim = parseDamageActor(owner);
    let previous = source.getSnapshot();
    this.releases.push(source.subscribe(() => {
      const next = source.getSnapshot(), before = previous; previous = next;
      if (next === before || next.lifeId !== before.lifeId || next.status === before.status
        || next.status !== 'downed' && next.status !== 'eliminated') return;
      const fact = source.getElimination();
      const actor = next.status === 'downed' ? source.getDowner()
        : fact?.cause === 'finishing-damage' ? fact.finisher : fact?.downer ?? null;
      const tick = next.status === 'eliminated' && fact ? fact.tick : Math.max(0, source.getTick());
      this.publish([...this.state, Object.freeze({ id: ++this.sequence, tick, kind: next.status, actor, victim, lifeId: next.lifeId })].slice(-COMBAT_LOG_CONFIG.capacity));
    }));
  }
  /** Called by the existing fixed-step resolution hook; no UI timers. */
  step(tick: number) {
    if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid combat log tick');
    if (this.disposed || tick < this.tick) return;
    this.tick = tick;
    const next = this.state.filter(event => tick - event.tick < COMBAT_LOG_CONFIG.lifetimeTicks);
    if (next.length !== this.state.length) this.publish(next);
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.releases.forEach(release => release()); this.releases.length = 0;
    this.publish([]); this.listeners.clear();
  }
}
