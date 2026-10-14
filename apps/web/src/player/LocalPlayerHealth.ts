import { PlayerHealthState } from '@bubble-arena/game-core';
import { TRAINING_PLAYER_HEALTH_CONFIG } from '@bubble-arena/shared';

export type HealthTestIntent = 'hit' | 'down';
/** Bounded local test input and subscriptions; damage is consumed by a physics hook. */
export class LocalPlayerHealth {
  private readonly rule = new PlayerHealthState();
  private readonly listeners = new Set<() => void>();
  private pending: HealthTestIntent | null = null;
  private tick = 0;
  private sequence = 0;
  getSnapshot = this.rule.getSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  requestTest = (intent: HealthTestIntent) => {
    if (intent !== 'hit' && intent !== 'down') throw new TypeError('Invalid health test intent');
    if (this.pending !== null || this.getSnapshot().status !== 'normal') return false;
    this.pending = intent; return true;
  };
  clearPending = () => { this.pending = null; };
  step() {
    const tick = this.tick++;
    const intent = this.pending; this.pending = null;
    if (intent === null) return false;
    const damage = intent === 'hit' ? TRAINING_PLAYER_HEALTH_CONFIG.hitDamage : TRAINING_PLAYER_HEALTH_CONFIG.downDamage;
    const accepted = this.rule.receiveDamage({ lifeId: this.getSnapshot().lifeId, tick, sequence: ++this.sequence }, damage, false);
    if (accepted) for (const listener of this.listeners) listener();
    return accepted;
  }
}
