import { PHYSICS_CONFIG, WEAPON_CONFIGS, parseWeaponConfig, type FireIntent, type WeaponConfig } from '@bubble-arena/shared';

export interface RifleAmmoState {
  readonly magazine: number;
  readonly reserve: number;
  readonly shotsFired: number;
  readonly reloading: boolean;
}
export interface RifleShot { readonly tick: number; readonly sequence: number }

/** Fixed-step local/authority rule; no clock, input device, renderer or hit result. */
export class RifleFireState {
  private readonly periodTicks: number;
  private readonly magazineSize: number;
  private readonly reloadTicks: number;
  private reloadEndTick = 0;
  private tick = 0;
  private nextShotTick = 0;
  private wasFiring = false;
  private state: RifleAmmoState;

  constructor(config: WeaponConfig = WEAPON_CONFIGS.rifle) {
    const validated = parseWeaponConfig(config);
    if (validated.id !== 'rifle' || validated.fireRate > PHYSICS_CONFIG.tickRate) {
      throw new RangeError('Rifle rule requires rifle config with fireRate <= tickRate');
    }
    this.periodTicks = PHYSICS_CONFIG.tickRate / validated.fireRate;
    if (!Number.isFinite(this.periodTicks)) throw new RangeError('Unrepresentable rifle fire interval');
    this.magazineSize = validated.magazineSize;
    this.reloadTicks = Math.ceil(validated.reloadDuration * PHYSICS_CONFIG.tickRate);
    if (!Number.isSafeInteger(this.reloadTicks) || this.reloadTicks < 1) throw new RangeError('Unrepresentable reload duration');
    this.state = Object.freeze({ reloading: false, magazine: validated.magazineSize, reserve: validated.reserveAmmo, shotsFired: 0 });
  }
  getState = () => this.state;
  /** Progress after the last processed fixed tick; null means no accepted reload. */
  getReloadProgress = (): number | null => this.state.reloading
    ? Math.max(0, Math.min(1, 1 - (this.reloadEndTick - (this.tick - 1)) / this.reloadTicks)) : null;

  step(intent: FireIntent, reloadPressed = false): RifleShot | null {
    if (!intent || typeof intent.held !== 'boolean' || typeof intent.pressed !== 'boolean' || typeof reloadPressed !== 'boolean') {
      throw new TypeError('Expected boolean fire intent');
    }
    const tick = this.tick++;
    // Reload has priority over fire; repeated requests cannot restart its deadline.
    if (this.state.reloading) {
      if (tick >= this.reloadEndTick) {
        const transferred = Math.min(this.magazineSize - this.state.magazine, this.state.reserve);
        this.state = Object.freeze({ ...this.state, reloading: false,
          magazine: this.state.magazine + transferred, reserve: this.state.reserve - transferred });
      }
      this.wasFiring = false;
      return null; // Completion tick is also reserved for reload, no buffered short shots.
    }
    if (reloadPressed && this.state.magazine < this.magazineSize && this.state.reserve > 0) {
      this.reloadEndTick = tick + this.reloadTicks;
      this.state = Object.freeze({ ...this.state, reloading: true });
      this.wasFiring = false;
      return null;
    }
    const firing = intent.held || intent.pressed;
    let shot: RifleShot | null = null;
    if (firing && this.state.magazine > 0 && tick >= this.nextShotTick) {
      // Preserve fractional phase during a burst (8/s at 60Hz alternates 8/7 ticks).
      // Idle periods start a fresh phase; never catch up missed shots after a pause.
      const phase = this.wasFiring && tick - this.nextShotTick < 1 ? this.nextShotTick : tick;
      this.nextShotTick = phase + this.periodTicks;
      this.state = Object.freeze({ ...this.state, magazine: this.state.magazine - 1,
        shotsFired: this.state.shotsFired + 1 });
      shot = Object.freeze({ tick, sequence: this.state.shotsFired });
    }
    this.wasFiring = firing;
    return shot;
  }
}
