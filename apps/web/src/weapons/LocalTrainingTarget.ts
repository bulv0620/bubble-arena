import { MovementSlow, TrainingTargetState, type TrainingHit } from '@bubble-arena/game-core';

import { DamageNumbers } from '../effects/DamageNumbers';

export class LocalTrainingTarget {
  readonly damageNumbers = new DamageNumbers();
  private readonly slow = new MovementSlow();
  private slowSnapshot = 1;
  getSlowSnapshot = () => this.slowSnapshot;
  private publishSlow() {
    const next = this.slow.getMultiplier();
    if (next === this.slowSnapshot) return;
    this.slowSnapshot = next;
    for (const listener of this.listeners) listener();
  }
  applySlow() { if (this.rule.getState().hp > 0) { this.slow.apply(); this.publishSlow(); } }
  private readonly rule = new TrainingTargetState();
  private listeners = new Set<() => void>();
  getSnapshot = () => this.rule.getState();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  step() {
    this.slow.step(); this.publishSlow();
    if (!this.rule.step()) return false;
    this.damageNumbers.clear();
    for (const listener of this.listeners) listener();
    return true;
  }
  receiveHit(hit: TrainingHit, resolvedDamage?: number) {
    const accepted = this.rule.receiveHit(hit, resolvedDamage);
    if (accepted) {
      if (this.rule.getState().hp === 0) { this.slow.clear(); this.publishSlow(); }
      this.damageNumbers.push(hit.sequence, this.rule.getState().lastDamage);
      for (const listener of this.listeners) listener();
    }
    return accepted;
  }
}
