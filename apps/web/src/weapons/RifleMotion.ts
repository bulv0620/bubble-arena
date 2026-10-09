import { RifleAccuracy } from '@bubble-arena/game-core';

/** Physics publishes actual horizontal motion and airborne state; subscribers update only when the resulting cone angle changes. */
export class RifleMotion {
  private readonly accuracy = new RifleAccuracy();
  private angle = this.accuracy.getAngle();
  private listeners = new Set<() => void>();
  getSnapshot = () => this.angle;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  setSpeed(speed: number, airborne = false) {
    this.accuracy.setMotion(Number.isFinite(speed) && speed >= 0 ? speed : 0, airborne === true);
    this.publish();
  }
  private publish() {
    const angle = this.accuracy.getAngle();
    if (angle === this.angle) return;
    this.angle = angle; for (const listener of this.listeners) listener();
  }
  step(acceptedShot: boolean) { const angle = this.accuracy.step(acceptedShot); this.publish(); return angle; }
  reset = () => { this.accuracy.reset(); this.publish(); };
}
