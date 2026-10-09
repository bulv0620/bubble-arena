import { PHYSICS_CONFIG, WEAPON_CONFIGS, parseWeaponConfig, type FireIntent, type WeaponConfig } from '@bubble-arena/shared';

export interface RifleAmmoState {
  readonly magazine: number;
  readonly reserve: number;
  readonly shotsFired: number;
}
export interface RifleShot { readonly tick: number; readonly sequence: number }

/** Fixed-step local/authority rule; no clock, input device, renderer or hit result. */
export class RifleFireState {
  private readonly periodTicks: number;
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
    this.state = Object.freeze({ magazine: validated.magazineSize, reserve: validated.reserveAmmo, shotsFired: 0 });
  }
  getState = () => this.state;

  step(intent: FireIntent): RifleShot | null {
    if (!intent || typeof intent.held !== 'boolean' || typeof intent.pressed !== 'boolean') {
      throw new TypeError('Expected boolean fire intent');
    }
    const tick = this.tick++;
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
