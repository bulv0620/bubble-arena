import { PHYSICS_CONFIG, WEAPON_HANDLING, SNIPER_SCOPE_CONFIG, type WeaponId } from '@bubble-arena/shared';

/** Fixed-step bloom; accepted shot uses the pre-kick cone, then opens the next shot's cone. */
export class WeaponAccuracy {
  private base: number;
  constructor(private readonly id: WeaponId) {
    if (!WEAPON_HANDLING[id]) throw new TypeError('Invalid accuracy weapon');
    this.base = WEAPON_HANDLING[id].spread.normal;
  }
  private bloom = 0;
  private tick = 0;
  private lastShotTick = -Infinity;
  getAngle = () => this.base + this.bloom;
  setMotion(speed: number, airborne: boolean, scoped = false) {
    if (!Number.isFinite(speed) || speed < 0 || typeof airborne !== 'boolean' || typeof scoped !== 'boolean') throw new RangeError('Invalid weapon motion');
    const config = WEAPON_HANDLING[this.id].spread;
    this.base = this.id === 'sniper' && scoped
      ? airborne ? SNIPER_SCOPE_CONFIG.airborne : speed >= config.movementSpeedThreshold ? SNIPER_SCOPE_CONFIG.moving : SNIPER_SCOPE_CONFIG.normal
      : config.normal * (airborne ? config.airborneMultiplier : speed >= config.movementSpeedThreshold ? config.movingMultiplier : 1);
  }
  step(acceptedShot: boolean): number {
    if (typeof acceptedShot !== 'boolean') throw new TypeError('Expected accepted-shot boolean');
    const tick = this.tick++;
    const config = WEAPON_HANDLING[this.id].spread;
    const delayTicks = Math.ceil(config.recoveryDelay * PHYSICS_CONFIG.tickRate);
    if (tick - this.lastShotTick > delayTicks) {
      this.bloom = Math.max(0, this.bloom - config.recoveryPerSecond * PHYSICS_CONFIG.timeStep);
    }
    const shotAngle = this.getAngle();
    if (acceptedShot) {
      this.bloom = Math.min(config.maxBloom, this.bloom + config.bloomPerShot);
      this.lastShotTick = tick;
    }
    return shotAngle;
  }
  reset() { this.base = WEAPON_HANDLING[this.id].spread.normal; this.bloom = 0; this.tick = 0; this.lastShotTick = -Infinity; }
}
