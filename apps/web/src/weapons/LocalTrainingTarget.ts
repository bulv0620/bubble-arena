import { TrainingTargetState, type TrainingHit } from '@bubble-arena/game-core';

export class LocalTrainingTarget {
  private readonly rule = new TrainingTargetState();
  private listeners = new Set<() => void>();
  getSnapshot = () => this.rule.getState();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  receiveHit(hit: TrainingHit) {
    const accepted = this.rule.receiveHit(hit);
    if (accepted) for (const listener of this.listeners) listener();
    return accepted;
  }
}
