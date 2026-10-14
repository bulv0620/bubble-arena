import { PlayerHealthState, type RescueChannel } from '@bubble-arena/game-core';
import { TRAINING_PLAYER_HEALTH_CONFIG, TRAINING_RESCUE_CONFIG } from '@bubble-arena/shared';

export type HealthTestIntent = 'hit' | 'down';
/** Bounded local test input and subscriptions; damage is consumed by a physics hook. */
export class LocalPlayerHealth {
  private readonly rule = new PlayerHealthState();
  private readonly listeners = new Set<() => void>();
  private pending: HealthTestIntent | null = null;
  private tick = 0;
  private sequence = 0;
  private damageRevision = 0;
  getDamageRevision = () => this.damageRevision;
  getTick = () => this.tick - 1;
  getSnapshot = this.rule.getSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  requestTest = (intent: HealthTestIntent) => {
    if (intent !== 'hit' && intent !== 'down') throw new TypeError('Invalid health test intent');
    const status = this.getSnapshot().status;
    if (this.pending !== null || (status !== 'normal' && status !== 'downed') || intent === 'down' && status !== 'normal') return false;
    this.pending = intent; return true;
  };
  clearPending = () => { this.pending = null; };
  completeRescue(channel: RescueChannel) {
    if (channel.target.playerId !== TRAINING_RESCUE_CONFIG.playerId) return false;
    const before = this.getSnapshot();
    const accepted = this.rule.completeRescue({ lifeId: channel.target.lifeId, revision: channel.target.revision, elapsedTicks: channel.elapsedTicks }, this.getTick(), false);
    if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
    return accepted;
  }
  onAcceptedFire(sequence: number) {
    const before = this.getSnapshot();
    const ended = this.rule.onAcceptedFire({ lifeId: before.lifeId, revision: before.revision, tick: this.getTick(), sequence }, false);
    if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
    return ended;
  }
  canCauseControl = () => this.getTick() < 0 || this.rule.canCauseControl(this.getTick(), false);
  step() {
    const tick = this.tick++;
    const before = this.getSnapshot();
    const intent = this.pending; this.pending = null;
    if (intent === null) {
      this.rule.advanceTick(tick, false);
      if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
      return false;
    }
    const damage = intent === 'hit' ? TRAINING_PLAYER_HEALTH_CONFIG.hitDamage : TRAINING_PLAYER_HEALTH_CONFIG.downDamage;
    const accepted = this.rule.receiveDamage({ lifeId: this.getSnapshot().lifeId, tick, sequence: ++this.sequence }, damage, false);
    if (accepted) this.damageRevision++;
    this.rule.advanceTick(tick, false);
    if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
    return accepted;
  }
}
