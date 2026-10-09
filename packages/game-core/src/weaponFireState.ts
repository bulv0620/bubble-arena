import { DEFAULT_RIFLE_AMMO_POLICY, PHYSICS_CONFIG, WEAPON_CONFIGS, parseWeaponConfig, type FireIntent, type RifleAmmoPolicy, type WeaponConfig } from '@bubble-arena/shared';

export interface RifleAmmoState {
  readonly magazine: number;
  readonly reserve: number;
  readonly shotsFired: number;
  readonly reloading: boolean;
}
export interface RifleShot { readonly tick: number; readonly sequence: number }

/** Fixed-step local/authority rule; no clock, input device, renderer or hit result. */
export class WeaponFireState {
  readonly infiniteReserve: boolean;
  private readonly autoReload: boolean;
  private readonly periodTicks: number;
  private readonly magazineSize: number;
  private readonly reloadTicks: number;
  private reloadEndTick = 0;
  private tick = 0;
  private nextShotTick = 0;
  private wasFiring = false;
  private state: RifleAmmoState;

  constructor(config: WeaponConfig = WEAPON_CONFIGS.rifle, policy: RifleAmmoPolicy = DEFAULT_RIFLE_AMMO_POLICY, private readonly fireMode: 'auto' | 'semi' = 'auto') {
    if (!policy || typeof policy.autoReload !== 'boolean' || typeof policy.infiniteReserve !== 'boolean'
      || Object.keys(policy).some(key => key !== 'autoReload' && key !== 'infiniteReserve')) throw new TypeError('Invalid rifle ammo policy');
    this.infiniteReserve = policy.infiniteReserve;
    this.autoReload = policy.autoReload;
    const validated = parseWeaponConfig(config);
    if (!['auto', 'semi'].includes(fireMode) || validated.fireRate > PHYSICS_CONFIG.tickRate) {
      throw new RangeError('Weapon rule requires valid mode and fireRate <= tickRate');
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

  cancelReload() {
    if (!this.state.reloading) return false;
    this.state = Object.freeze({ ...this.state, reloading: false });
    this.wasFiring = false;
    return true;
  }
  step(intent: FireIntent, reloadPressed = false): RifleShot | null {
    if (!intent || typeof intent.held !== 'boolean' || typeof intent.pressed !== 'boolean' || typeof reloadPressed !== 'boolean') {
      throw new TypeError('Expected boolean fire intent');
    }
    const tick = this.tick++;
    // Reload has priority over fire; repeated requests cannot restart its deadline.
    if (this.state.reloading) {
      if (tick >= this.reloadEndTick) {
        const transferred = this.infiniteReserve ? this.magazineSize - this.state.magazine
          : Math.min(this.magazineSize - this.state.magazine, this.state.reserve);
        this.state = Object.freeze({ ...this.state, reloading: false,
          magazine: this.state.magazine + transferred, reserve: this.infiniteReserve ? this.state.reserve : this.state.reserve - transferred });
      }
      this.wasFiring = false;
      return null; // Completion tick is also reserved for reload, no buffered short shots.
    }
    if (reloadPressed && this.state.magazine < this.magazineSize && (this.infiniteReserve || this.state.reserve > 0)) {
      this.reloadEndTick = tick + this.reloadTicks;
      this.state = Object.freeze({ ...this.state, reloading: true });
      this.wasFiring = false;
      return null;
    }
    const firing = this.fireMode === 'auto' ? intent.held || intent.pressed : intent.pressed;
    let shot: RifleShot | null = null;
    if (firing && this.state.magazine > 0 && tick >= this.nextShotTick) {
      // Preserve fractional phase during a burst (8/s at 60Hz alternates 8/7 ticks).
      // Idle periods start a fresh phase; never catch up missed shots after a pause.
      const phase = this.wasFiring && tick - this.nextShotTick < 1 ? this.nextShotTick : tick;
      this.nextShotTick = phase + this.periodTicks;
      this.state = Object.freeze({ ...this.state, magazine: this.state.magazine - 1,
        shotsFired: this.state.shotsFired + 1 });
      shot = Object.freeze({ tick, sequence: this.state.shotsFired });
      // The final shot still resolves normally while its accepted empty reload starts.
      if (this.autoReload && this.state.magazine === 0 && (this.infiniteReserve || this.state.reserve > 0)) {
        this.reloadEndTick = tick + this.reloadTicks;
        this.state = Object.freeze({ ...this.state, reloading: true });
      }
    }
    this.wasFiring = firing && !this.state.reloading;
    return shot;
  }
}
