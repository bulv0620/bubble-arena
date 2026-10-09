import { rifleSpreadAngle } from '@bubble-arena/game-core';

/** Physics publishes actual horizontal motion; subscribers update only on spread mode changes. */
export class RifleMotion {
  private angle = rifleSpreadAngle(0);
  private listeners = new Set<() => void>();
  getSnapshot = () => this.angle;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  setSpeed(speed: number) {
    const angle = rifleSpreadAngle(Number.isFinite(speed) && speed >= 0 ? speed : 0);
    if (angle === this.angle) return;
    this.angle = angle; for (const listener of this.listeners) listener();
  }
  reset = () => this.setSpeed(0);
}
