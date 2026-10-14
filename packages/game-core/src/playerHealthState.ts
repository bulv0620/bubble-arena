import { PHYSICS_CONFIG, PLAYER_LIFE_CONFIG, PLAYER_VITALS_CONFIG, RESCUE_PROTECTION_CONFIG, parseRescueProtectionConfig,
  type RescueProtectionConfig, type PlayerLifeConfig, type PlayerLifeSnapshot } from '@bubble-arena/shared';
import { PlayerLifeMachine } from './playerLifeMachine';
import type { PlayerVitals } from './playerVitals';

/** sequence is the victim's resolved-hit order, not an individual attacker's shot counter. */
export interface PlayerDamageIdentity { readonly lifeId: number; readonly tick: number; readonly sequence: number }
export interface PlayerFireIdentity extends PlayerDamageIdentity { readonly revision: number }
export interface PlayerRescueCompletion { readonly lifeId: number; readonly revision: number; readonly elapsedTicks: number }
export interface PlayerHealthSnapshot extends PlayerVitals, PlayerLifeSnapshot {
  readonly protected: boolean;
  readonly downedSecondsRemaining: number;
  readonly eliminationReason: 'finishing-damage' | 'downed-timeout' | null;
  readonly downedHp: number;
  readonly maxDownedHp: number;
  readonly lastDamage: number;
}
/** Authoritative health, rescue and downed expiry; spawning/scoring are separate. */
export class PlayerHealthState {
  private readonly life: PlayerLifeMachine;
  private state: PlayerHealthSnapshot;
  private lastSequence = 0;
  private lastTick = -1;
  private clockTick = -1;
  private protectionEndTick = 0;
  private lastFireSequence = 0;
  private downedEndTick = 0;
  private readonly downedTicks: number;
  private readonly protectionTicks: number;
  constructor(lifeId = 1, config: PlayerLifeConfig = PLAYER_LIFE_CONFIG, protectionConfig: RescueProtectionConfig = RESCUE_PROTECTION_CONFIG) {
    this.life = new PlayerLifeMachine(lifeId, config);
    this.downedTicks = Math.ceil(this.life.config.downedDuration * PHYSICS_CONFIG.tickRate);
    this.protectionTicks = Math.ceil(parseRescueProtectionConfig(protectionConfig).duration * PHYSICS_CONFIG.tickRate);
    this.state = Object.freeze({ ...this.life.getSnapshot(), hp: PLAYER_VITALS_CONFIG.maxHp, maxHp: PLAYER_VITALS_CONFIG.maxHp,
      downedHp: 0, maxDownedHp: this.life.config.downedHp, lastDamage: 0, protected: false, downedSecondsRemaining: 0, eliminationReason: null });
  }
  getSnapshot = () => this.state;
  /** Call after current-tick damage and before rescue. The deadline never extends. */
  advanceTick(tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    if (matchFinished || tick < this.clockTick) return false;
    const before = this.state;
    this.advanceProtection(tick, matchFinished);
    if (this.state.status === 'downed') {
      if (tick >= this.downedEndTick) {
        if (this.life.transition({ type: 'downed_timeout', lifeId: this.state.lifeId, revision: this.state.revision,
          elapsedTicks: this.downedTicks }, matchFinished)) {
          this.state = Object.freeze({ ...this.state, ...this.life.getSnapshot(), downedHp: 0, downedSecondsRemaining: 0,
            lastDamage: 0, protected: false, eliminationReason: 'downed-timeout' });
        }
      } else {
        const remaining = Math.ceil((this.downedEndTick - tick) / PHYSICS_CONFIG.tickRate);
        if (remaining !== this.state.downedSecondsRemaining) this.state = Object.freeze({ ...this.state, downedSecondsRemaining: remaining });
      }
    }
    return this.state !== before;
  }
  advanceProtection(tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    if (matchFinished || tick < this.clockTick) return false;
    this.clockTick = tick;
    if (!this.state.protected || tick < this.protectionEndTick) return false;
    this.state = Object.freeze({ ...this.state, protected: false }); return true;
  }
  isProtected(tick: number) {
    validateTick(tick, false);
    return tick >= this.clockTick && this.state.protected && tick < this.protectionEndTick;
  }
  canReceiveControl(tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    return !matchFinished && tick >= this.clockTick && this.state.status === 'normal' && !this.isProtected(tick);
  }
  canCauseControl(tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    return !matchFinished && tick >= this.clockTick && !this.isProtected(tick);
  }
  /** Consumed progress output only; not a client rescue command. */
  completeRescue(fact: PlayerRescueCompletion, tick: number, matchFinished: boolean) {
    validateData(fact, ['lifeId', 'revision', 'elapsedTicks']); validateTick(tick, matchFinished);
    if (!Number.isSafeInteger(fact.lifeId) || fact.lifeId < 1 || !Number.isSafeInteger(fact.revision) || fact.revision < 0
      || !Number.isSafeInteger(fact.elapsedTicks) || fact.elapsedTicks < 0) throw new RangeError('Invalid rescue completion identity');
    const current = this.state;
    if (matchFinished || tick < this.clockTick || current.status !== 'downed' || current.lifeId !== fact.lifeId || current.revision !== fact.revision
      || fact.elapsedTicks < Math.ceil(this.life.config.rescueDuration * PHYSICS_CONFIG.tickRate) || tick >= this.downedEndTick) return false;
    const end = tick + this.protectionTicks;
    if (!Number.isSafeInteger(end)) throw new RangeError('Rescue protection tick exhausted');
    if (!this.life.transition({ type: 'rescue_completed', ...fact }, matchFinished)) return false;
    this.clockTick = tick; this.protectionEndTick = end; this.downedEndTick = 0;
    this.state = Object.freeze({ ...current, ...this.life.getSnapshot(), hp: this.life.config.revivedHp, downedHp: 0, lastDamage: 0,
      protected: true, downedSecondsRemaining: 0, eliminationReason: null });
    return true;
  }
  onAcceptedFire(fire: PlayerFireIdentity, matchFinished: boolean) {
    validateData(fire, ['lifeId', 'revision', 'tick', 'sequence']); validateTick(fire.tick, matchFinished);
    if (!Number.isSafeInteger(fire.lifeId) || fire.lifeId < 1 || !Number.isSafeInteger(fire.revision) || fire.revision < 0
      || !Number.isSafeInteger(fire.sequence) || fire.sequence < 1) throw new RangeError('Invalid accepted fire identity');
    if (matchFinished || fire.tick < this.clockTick || fire.lifeId !== this.state.lifeId || fire.revision !== this.state.revision
      || this.state.status !== 'normal' || fire.sequence <= this.lastFireSequence) return false;
    const wasProtected = this.isProtected(fire.tick);
    this.lastFireSequence = fire.sequence; this.clockTick = fire.tick;
    if (!this.state.protected) return false;
    this.protectionEndTick = fire.tick; this.state = Object.freeze({ ...this.state, protected: false }); return wasProtected;
  }
  /** Identity and resolvedDamage are simulation output, never client-provided hit results. */
  receiveDamage(hit: PlayerDamageIdentity, resolvedDamage: number, matchFinished: boolean): boolean {
    const keys = ['lifeId', 'tick', 'sequence'];
    if (!hit || typeof hit !== 'object' || Array.isArray(hit) || ![Object.prototype, null].includes(Object.getPrototypeOf(hit))
      || Reflect.ownKeys(hit).length !== keys.length || keys.some(key => {
        const descriptor = Object.getOwnPropertyDescriptor(hit, key); return !descriptor || !('value' in descriptor);
      })) throw new TypeError('Invalid player damage identity');
    if (!Number.isSafeInteger(hit.lifeId) || hit.lifeId < 1 || !Number.isSafeInteger(hit.sequence) || hit.sequence < 1
      || !Number.isSafeInteger(hit.tick) || hit.tick < 0) throw new RangeError('Invalid player damage identity values');
    if (!Number.isSafeInteger(resolvedDamage) || resolvedDamage <= 0) throw new RangeError('Expected resolved positive integer damage');
    if (typeof matchFinished !== 'boolean') throw new TypeError('Expected finished gate');
    let current = this.state;
    if (matchFinished || (current.status !== 'normal' && current.status !== 'downed') || hit.lifeId !== current.lifeId
      || hit.sequence <= this.lastSequence || hit.tick < this.lastTick || hit.tick < this.clockTick) return false;
    if (current.status === 'downed' && hit.tick > this.downedEndTick) { this.advanceTick(hit.tick, matchFinished); return false; }
    if (current.status === 'normal' && !this.isProtected(hit.tick) && resolvedDamage >= current.hp
      && !Number.isSafeInteger(hit.tick + this.downedTicks)) throw new RangeError('Downed deadline exhausted');
    this.advanceProtection(hit.tick, matchFinished); current = this.state;
    if (this.isProtected(hit.tick)) { this.lastSequence = hit.sequence; this.lastTick = hit.tick; return false; }
    if (current.status === 'downed') {
      const lastDamage = Math.min(resolvedDamage, current.downedHp), downedHp = current.downedHp - lastDamage;
      if (downedHp === 0 && !this.life.transition({ type: 'hp_depleted', hp: 0, lifeId: current.lifeId, revision: current.revision }, matchFinished)) return false;
      this.lastSequence = hit.sequence; this.lastTick = hit.tick;
      this.state = Object.freeze({ ...current, ...this.life.getSnapshot(), downedHp, lastDamage,
        downedSecondsRemaining: downedHp === 0 ? 0 : current.downedSecondsRemaining,
        eliminationReason: downedHp === 0 ? 'finishing-damage' : null });
      return true;
    }
    const lastDamage = Math.min(resolvedDamage, current.hp), hp = current.hp - lastDamage;
    const end = hp === 0 ? hit.tick + this.downedTicks : 0;
    if (hp === 0 && !this.life.transition({ type: 'hp_depleted', hp, lifeId: current.lifeId, revision: current.revision }, matchFinished)) return false;
    if (hp === 0) this.downedEndTick = end;
    this.lastSequence = hit.sequence; this.lastTick = hit.tick;
    this.state = Object.freeze({ ...current, ...this.life.getSnapshot(), hp, lastDamage,
      downedHp: hp === 0 ? current.maxDownedHp : 0, protected: false,
      downedSecondsRemaining: hp === 0 ? Math.ceil(this.downedTicks / PHYSICS_CONFIG.tickRate) : 0 });
    return true;
  }
}
function validateTick(tick: number, finished: boolean) {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid player protection tick');
  if (typeof finished !== 'boolean') throw new TypeError('Expected finished gate');
}
function validateData(value: object, keys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== keys.length || keys.some(key => {
      const field = Object.getOwnPropertyDescriptor(value, key); return !field || !('value' in field);
    })) throw new TypeError('Invalid player life fact');
}
