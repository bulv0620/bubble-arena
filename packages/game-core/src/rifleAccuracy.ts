import { PHYSICS_CONFIG, RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import { rifleSpreadAngle } from './rifleSpread';

/** Fixed-step bloom; accepted shot uses the pre-kick cone, then opens the next shot's cone. */
export class RifleAccuracy {
  private base = rifleSpreadAngle(0);
  private bloom = 0;
  private tick = 0;
  private lastShotTick = -Infinity;
  getAngle = () => this.base + this.bloom;
  setMotion(speed: number, airborne: boolean) { this.base = rifleSpreadAngle(speed, airborne); }
  step(acceptedShot: boolean): number {
    if (typeof acceptedShot !== 'boolean') throw new TypeError('Expected accepted-shot boolean');
    const tick = this.tick++;
    const delayTicks = Math.ceil(RIFLE_SPREAD_CONFIG.recoveryDelay * PHYSICS_CONFIG.tickRate);
    if (tick - this.lastShotTick > delayTicks) {
      this.bloom = Math.max(0, this.bloom - RIFLE_SPREAD_CONFIG.recoveryPerSecond * PHYSICS_CONFIG.timeStep);
    }
    const shotAngle = this.getAngle();
    if (acceptedShot) {
      this.bloom = Math.min(RIFLE_SPREAD_CONFIG.maxBloom, this.bloom + RIFLE_SPREAD_CONFIG.bloomPerShot);
      this.lastShotTick = tick;
    }
    return shotAngle;
  }
  reset() { this.base = rifleSpreadAngle(0); this.bloom = 0; this.tick = 0; this.lastShotTick = -Infinity; }
}
