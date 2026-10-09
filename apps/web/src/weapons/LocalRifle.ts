import { RifleFireState, type RifleAmmoState } from '@bubble-arena/game-core';
import type { FireIntent } from '@bubble-arena/shared';

/** Single-player adapter; future server must run the same core rule independently. */
export class LocalRifle {
  private readonly rule = new RifleFireState();
  private subscribers = new Set<() => void>();
  getSnapshot = (): RifleAmmoState => this.rule.getState();
  subscribe = (listener: () => void) => {
    this.subscribers.add(listener);
    return () => { this.subscribers.delete(listener); };
  };
  step(intent: FireIntent) {
    const shot = this.rule.step(intent);
    if (shot) for (const listener of this.subscribers) listener();
    return shot;
  }
}
