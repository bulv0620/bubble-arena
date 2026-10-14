import { WeaponAccuracy, WeaponFireState, playerActionPolicy, type RifleAmmoState } from '@bubble-arena/game-core';
import { WEAPON_IDS, WEAPON_CONFIGS, WEAPON_HANDLING, TRAINING_RIFLE_AMMO_POLICY, weaponGroundSpeed, isPrimaryWeaponId,
  type PrimaryWeaponId, type WeaponId, type FireIntent, type PlayerLifeStatus } from '@bubble-arena/shared';
export type WeaponSlot = 1 | 2;
export interface LoadoutSnapshot { readonly rescuing: boolean; readonly lifeStatus: PlayerLifeStatus; readonly primary: PrimaryWeaponId; readonly active: WeaponId; readonly scoped: boolean; readonly ammo: RifleAmmoState; readonly progress: number | null; readonly cooldownProgress: number | null; readonly cooldownRemaining: number }
export interface EquippedShot { readonly tick: number; readonly sequence: number; readonly weapon: WeaponId; readonly angle: number }
const RELEASED = Object.freeze({ held: false, pressed: false });

/** Local simulation adapter. One monotonic shot identity across weapons and independent ammo/cooldowns. */
export class LocalLoadout {
  private readonly rules = Object.fromEntries(WEAPON_IDS.map(id => [id, new WeaponFireState(WEAPON_CONFIGS[id], TRAINING_RIFLE_AMMO_POLICY, WEAPON_HANDLING[id].fireMode)])) as Record<WeaponId, WeaponFireState>;
  private readonly accuracy = Object.fromEntries(WEAPON_IDS.map(id => [id, new WeaponAccuracy(id)])) as Record<WeaponId, WeaponAccuracy>;
  private primary: PrimaryWeaponId;
  private active: WeaponId;
  private scoped = false;
  private lifeStatus: PlayerLifeStatus = 'normal';
  private rescuing = false;
  private sequence = 0;
  private tick = 0;
  private speed = 0;
  private airborne = false;
  private reloadOnEquip = false;
  private snapshot: LoadoutSnapshot;
  private listeners = new Set<() => void>();
  readonly infiniteReserve = true;
  constructor(primary: PrimaryWeaponId = 'rifle') {
    if (!isPrimaryWeaponId(primary)) throw new TypeError('Invalid primary weapon');
    this.primary = primary; this.active = primary;
    this.snapshot = this.buildSnapshot();
  }
  private buildSnapshot(): LoadoutSnapshot {
    const cooldown = WEAPON_HANDLING[this.active].fireMode === 'semi' ? this.rules[this.active].getFireCooldown() : null;
    return Object.freeze({ rescuing: this.rescuing, lifeStatus: this.lifeStatus, primary: this.primary, active: this.active, scoped: this.scoped,
      ammo: this.rules[this.active].getState(), progress: this.rules[this.active].getReloadProgress(),
      cooldownProgress: cooldown?.progress ?? null, cooldownRemaining: cooldown?.remaining ?? 0 });
  }
  private publish() {
    const next = this.buildSnapshot(), old = this.snapshot;
    if (next.rescuing === old.rescuing && next.lifeStatus === old.lifeStatus && next.primary === old.primary && next.active === old.active && next.scoped === old.scoped && next.ammo === old.ammo && next.progress === old.progress
      && next.cooldownProgress === old.cooldownProgress && next.cooldownRemaining === old.cooldownRemaining) return;
    this.snapshot = next; for (const listener of this.listeners) listener();
  }
  getSnapshot = () => this.snapshot;
  /** Keep equipped slots and monotonic effect identities; reset per-life weapon rules. */
  resetForRespawn() {
    for (const id of WEAPON_IDS) {
      this.rules[id] = new WeaponFireState(WEAPON_CONFIGS[id], TRAINING_RIFLE_AMMO_POLICY, WEAPON_HANDLING[id].fireMode);
      this.accuracy[id].reset();
    }
    this.scoped = false; this.rescuing = false; this.speed = 0; this.airborne = false; this.reloadOnEquip = false; this.publish();
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  canOperate = () => playerActionPolicy(this.lifeStatus).canUseWeapons && !this.rescuing;
  getSpeed = () => this.rescuing ? 0 : playerActionPolicy(this.lifeStatus).maximumSpeed ?? weaponGroundSpeed(this.active, this.scoped);
  setRescuing(value: boolean) {
    if (typeof value !== 'boolean') throw new TypeError('Invalid rescue weapon gate');
    if (this.rescuing === value) return;
    this.rescuing = value;
    if (value) {
      this.scoped = false; this.reloadOnEquip = false;
      for (const id of WEAPON_IDS) this.rules[id].cancelReload();
      this.accuracy[this.active].setMotion(this.speed, this.airborne, false);
    }
    this.publish();
  }
  setLifeStatus(status: PlayerLifeStatus) {
    const policy = playerActionPolicy(status);
    if (status === this.lifeStatus) return;
    this.lifeStatus = status;
    if (!policy.canUseWeapons) {
      this.scoped = false; this.reloadOnEquip = false;
      for (const id of WEAPON_IDS) this.rules[id].cancelReload();
      this.accuracy[this.active].setMotion(this.speed, this.airborne, false);
    }
    this.publish();
  }
  getAngle = () => this.accuracy[this.active].getAngle();
  getTick = () => this.tick - 1;
  canScope = () => this.canOperate() && this.active === 'sniper' && this.rules.sniper.getFireCooldown() === null
    && !this.rules.sniper.getState().reloading && this.rules.sniper.getState().magazine > 0;
  getWeaponAmmo = (id: WeaponId) => { if (!this.rules[id]) throw new TypeError('Invalid weapon'); return this.rules[id].getState(); };
  setMotion(speed: number, airborne: boolean) {
    if (!Number.isFinite(speed) || speed < 0 || typeof airborne !== 'boolean') throw new RangeError('Invalid loadout motion');
    this.speed = speed; this.airborne = airborne;
    this.accuracy[this.active].setMotion(speed, airborne, this.scoped);
  }
  setScoped(value: boolean) {
    if (typeof value !== 'boolean') throw new TypeError('Invalid scope intent');
    this.scoped = value && this.canScope();
    this.accuracy[this.active].setMotion(this.speed, this.airborne, this.scoped);
    this.publish();
  }
  setPrimary(id: PrimaryWeaponId) {
    if (!isPrimaryWeaponId(id)) throw new TypeError('Invalid primary weapon');
    if (!this.canOperate()) return false;
    this.primary = id; this.equip(id); this.publish(); return true;
  }
  private equip(id: WeaponId) {
    if (id === this.active) return false;
    this.rules[this.active].cancelReload();
    this.active = id; this.scoped = false;
    this.reloadOnEquip = this.rules[id].getState().magazine === 0;
    this.accuracy[id].setMotion(this.speed, this.airborne, false);
    return true;
  }
  /** Returns whether switching actually occurred so inputs can be cleared before a new shot. */
  select(slot: WeaponSlot) {
    if (slot !== 1 && slot !== 2) throw new TypeError('Invalid weapon slot');
    if (!this.canOperate()) return false;
    const changed = this.equip(slot === 1 ? this.primary : 'bubble'); this.publish(); return changed;
  }
  step(intent: FireIntent, reload = false): EquippedShot | null {
    if (!intent || typeof intent.held !== 'boolean' || typeof intent.pressed !== 'boolean' || typeof reload !== 'boolean') throw new TypeError('Invalid loadout fire intent');
    const tick = this.tick++;
    const reloadNow = this.canOperate() && (reload || this.reloadOnEquip); this.reloadOnEquip = false;
    let accepted: EquippedShot | null = null;
    for (const id of WEAPON_IDS) {
      const active = id === this.active;
      const shot = this.rules[id].step(active ? intent : RELEASED, active && reloadNow, this.canOperate());
      const angle = this.accuracy[id].step(shot !== null);
      if (shot) accepted = Object.freeze({ tick, sequence: ++this.sequence, weapon: id, angle });
    }
    // Capture this shot's scoped accuracy first, then close the lens and block reopening.
    if (this.active === 'sniper' && !this.canScope()) {
      this.scoped = false; this.accuracy.sniper.setMotion(this.speed, this.airborne, false);
    }
    this.publish(); return accepted;
  }
}
