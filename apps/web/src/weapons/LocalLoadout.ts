import { WeaponAccuracy, WeaponFireState, playerActionPolicy, type RifleAmmoState } from '@bubble-arena/game-core';
import { LOCOMOTION_CONFIG, WEAPON_IDS, WEAPON_CONFIGS, WEAPON_HANDLING, TRAINING_RIFLE_AMMO_POLICY, weaponGroundSpeed, isWeaponId, weaponForSlot,
  type WeaponSlot, type WeaponId, type FireIntent, type PlayerLifeStatus } from '@bubble-arena/shared';
export type { WeaponSlot } from '@bubble-arena/shared';
export interface LoadoutSnapshot { readonly muzzleBlocked: boolean; readonly matchPlaying: boolean; readonly sprinting: boolean; readonly rescuing: boolean; readonly lifeStatus: PlayerLifeStatus; readonly active: WeaponId; readonly scoped: boolean; readonly ammo: RifleAmmoState; readonly progress: number | null; readonly cooldownProgress: number | null; readonly cooldownRemaining: number }
export interface EquippedShot { readonly tick: number; readonly sequence: number; readonly weapon: WeaponId; readonly angle: number }
const RELEASED = Object.freeze({ held: false, pressed: false });

/** Local simulation adapter. One monotonic shot identity across weapons and independent ammo/cooldowns. */
export class LocalLoadout {
  private readonly rules = Object.fromEntries(WEAPON_IDS.map(id => [id, new WeaponFireState(WEAPON_CONFIGS[id], TRAINING_RIFLE_AMMO_POLICY, WEAPON_HANDLING[id].fireMode)])) as Record<WeaponId, WeaponFireState>;
  private readonly accuracy = Object.fromEntries(WEAPON_IDS.map(id => [id, new WeaponAccuracy(id)])) as Record<WeaponId, WeaponAccuracy>;
  private active: WeaponId;
  private scoped = false;
  private lifeStatus: PlayerLifeStatus = 'normal';
  private rescuing = false;
  private sprinting = false;
  private muzzleBlocked = false;
  private sequence = 0;
  private tick = 0;
  private speed = 0;
  private airborne = false;
  private reloadOnEquip = false;
  private snapshot: LoadoutSnapshot;
  private listeners = new Set<() => void>();
  readonly infiniteReserve = true;
  constructor(initialWeapon: WeaponId = 'rifle', readonly matchCanPlay: () => boolean = () => true) {
    if (!isWeaponId(initialWeapon)) throw new TypeError('Invalid initial weapon');
    this.active = initialWeapon;
    this.snapshot = this.buildSnapshot();
  }
  private buildSnapshot(): LoadoutSnapshot {
    const cooldown = WEAPON_HANDLING[this.active].fireMode === 'semi' ? this.rules[this.active].getFireCooldown() : null;
    return Object.freeze({ muzzleBlocked: this.muzzleBlocked, matchPlaying: this.matchCanPlay(), sprinting: this.sprinting, rescuing: this.rescuing, lifeStatus: this.lifeStatus, active: this.active, scoped: this.scoped,
      ammo: this.rules[this.active].getState(), progress: this.rules[this.active].getReloadProgress(),
      cooldownProgress: cooldown?.progress ?? null, cooldownRemaining: cooldown?.remaining ?? 0 });
  }
  private publish() {
    const next = this.buildSnapshot(), old = this.snapshot;
    if (next.muzzleBlocked === old.muzzleBlocked && next.sprinting === old.sprinting && next.matchPlaying === old.matchPlaying && next.rescuing === old.rescuing && next.lifeStatus === old.lifeStatus && next.active === old.active && next.scoped === old.scoped && next.ammo === old.ammo && next.progress === old.progress
      && next.cooldownProgress === old.cooldownProgress && next.cooldownRemaining === old.cooldownRemaining) return;
    this.snapshot = next; for (const listener of this.listeners) listener();
  }
  setMuzzleBlocked(value: boolean) {
    if (typeof value !== 'boolean') throw new TypeError('Invalid muzzle state');
    if (this.muzzleBlocked === value) return;
    this.muzzleBlocked = value; this.publish();
  }
  getSnapshot = () => this.snapshot;
  refreshMatchGate() { if (!this.matchCanPlay()) { this.scoped = false; this.sprinting = false; } this.publish(); }
  /** Keep equipped slots and monotonic effect identities; reset per-life weapon rules. */
  resetForRespawn() {
    for (const id of WEAPON_IDS) {
      this.rules[id] = new WeaponFireState(WEAPON_CONFIGS[id], TRAINING_RIFLE_AMMO_POLICY, WEAPON_HANDLING[id].fireMode);
      this.accuracy[id].reset();
    }
    this.muzzleBlocked = false; this.scoped = false; this.rescuing = false; this.sprinting = false; this.speed = 0; this.airborne = false; this.reloadOnEquip = false; this.publish();
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  canOperate = () => this.matchCanPlay() && playerActionPolicy(this.lifeStatus).canUseWeapons && !this.rescuing;
  getSpeed = () => !this.matchCanPlay() || this.rescuing ? 0 : playerActionPolicy(this.lifeStatus).maximumSpeed ?? weaponGroundSpeed(this.active, this.scoped) * (this.sprinting ? LOCOMOTION_CONFIG.sprintMultiplier : 1);
  getMotionSpeed = () => this.speed;
  setSprinting(value: boolean) {
    if(typeof value!=='boolean')throw new TypeError('Invalid sprint intent');
    const sprint=value&&this.canOperate();if(sprint===this.sprinting)return;
    this.sprinting=sprint;if(sprint){this.scoped=false;this.accuracy[this.active].setMotion(this.speed,this.airborne,false);}this.publish();
  }
  setRescuing(value: boolean) {
    if (typeof value !== 'boolean') throw new TypeError('Invalid rescue weapon gate');
    if (this.rescuing === value) return;
    this.rescuing = value;
    if (value) {
      this.sprinting = false;
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
      this.sprinting = false;
      this.scoped = false; this.reloadOnEquip = false;
      for (const id of WEAPON_IDS) this.rules[id].cancelReload();
      this.accuracy[this.active].setMotion(this.speed, this.airborne, false);
    }
    this.publish();
  }
  getAngle = () => this.accuracy[this.active].getAngle();
  getTick = () => this.tick - 1;
  canScope = () => this.canOperate() && !this.sprinting && this.active === 'sniper' && this.rules.sniper.getFireCooldown() === null
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
    const id = weaponForSlot(slot);
    if (!this.canOperate()) return false;
    const changed = this.equip(id); this.publish(); return changed;
  }
  step(intent: FireIntent, reload = false): EquippedShot | null {
    if (!intent || typeof intent.held !== 'boolean' || typeof intent.pressed !== 'boolean' || typeof reload !== 'boolean') throw new TypeError('Invalid loadout fire intent');
    if (!this.matchCanPlay()) return null;
    const tick = this.tick++;
    const reloadNow = this.canOperate() && (reload || this.reloadOnEquip); this.reloadOnEquip = false;
    let accepted: EquippedShot | null = null;
    for (const id of WEAPON_IDS) {
      const active = id === this.active;
      const shot = this.rules[id].step(active && !this.sprinting ? intent : RELEASED, active && reloadNow, this.canOperate());
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
