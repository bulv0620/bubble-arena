import { RifleAccuracy } from '@bubble-arena/game-core';
import type { LocalLoadout } from './LocalLoadout';

/** Physics publishes actual horizontal motion and airborne state; subscribers update only when the resulting cone angle changes. */
export class RifleMotion {
  private readonly accuracy = new RifleAccuracy();
  private angle = this.accuracy.getAngle();
  private listeners = new Set<() => void>();
  constructor(private readonly loadout?: LocalLoadout) { this.angle = loadout?.getAngle() ?? this.angle; }
  getSnapshot = () => this.angle;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  setSpeed(speed: number, airborne = false) {
    if (this.loadout) { this.loadout.setMotion(Number.isFinite(speed) && speed >= 0 ? speed : 0, airborne === true); this.publish(); return; }
    this.accuracy.setMotion(Number.isFinite(speed) && speed >= 0 ? speed : 0, airborne === true);
    this.publish();
  }
  private publish() {
    const angle = this.loadout?.getAngle() ?? this.accuracy.getAngle();
    if (angle === this.angle) return;
    this.angle = angle; for (const listener of this.listeners) listener();
  }
  step(acceptedShot: boolean) { const angle = this.accuracy.step(acceptedShot); this.publish(); return angle; }
  refresh = () => this.publish();
  reset = () => { this.accuracy.reset(); this.publish(); };
}
