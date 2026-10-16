import { PHYSICS_CONFIG, PLAYER_LIFE_CONFIG, PLAYER_VITALS_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, parseRespawnConfig, parseRescueProtectionConfig, parseDamageActor,
  type DamageActor, type EliminationFact, type RespawnConfig, type RescueProtectionConfig, type PlayerLifeConfig, type PlayerLifeSnapshot } from '@bubble-arena/shared';
import { PlayerLifeMachine } from './playerLifeMachine';
import type { PlayerVitals } from './playerVitals';

/** sequence is the victim's resolved-hit order, not an individual attacker's shot counter. */
export interface PlayerDamageIdentity { readonly lifeId: number; readonly tick: number; readonly sequence: number }
export interface PlayerFireIdentity extends PlayerDamageIdentity { readonly revision: number }
export interface PlayerRescueCompletion { readonly lifeId: number; readonly revision: number; readonly elapsedTicks: number }
export interface PlayerSpawnIdentity { readonly lifeId: number; readonly revision: number }
export interface PlayerHealthSnapshot extends PlayerVitals, PlayerLifeSnapshot {
  readonly protected: boolean;
  readonly downedSecondsRemaining: number;
  readonly eliminationReason: 'finishing-damage' | 'downed-timeout' | null;
  readonly respawnSecondsRemaining: number;
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
  private eliminatedTick = 0;
  private readonly respawnTicks: number;
  private readonly spawnProtectionTicks: number;
  private spawning = false;
  private readonly owner: DamageActor | null;
  private downer: DamageActor | null = null;
  private elimination: EliminationFact | null = null;
  private readonly protectionTicks: number;
  constructor(lifeId = 1, config: PlayerLifeConfig = PLAYER_LIFE_CONFIG, protectionConfig: RescueProtectionConfig = RESCUE_PROTECTION_CONFIG, respawnConfig: RespawnConfig = RESPAWN_CONFIG, owner: DamageActor | null = null) {
    this.owner = owner === null ? null : parseDamageActor(owner);
    this.life = new PlayerLifeMachine(lifeId, config);
    this.downedTicks = Math.ceil(this.life.config.downedDuration * PHYSICS_CONFIG.tickRate);
    this.respawnTicks = Math.ceil(this.life.config.respawnDelay * PHYSICS_CONFIG.tickRate);
    this.spawnProtectionTicks = Math.ceil(parseRespawnConfig(respawnConfig).protectionDuration * PHYSICS_CONFIG.tickRate);
    this.protectionTicks = Math.ceil(parseRescueProtectionConfig(protectionConfig).duration * PHYSICS_CONFIG.tickRate);
    this.state = Object.freeze({ ...this.life.getSnapshot(), hp: PLAYER_VITALS_CONFIG.maxHp, maxHp: PLAYER_VITALS_CONFIG.maxHp,
      downedHp: 0, maxDownedHp: this.life.config.downedHp, lastDamage: 0, protected: false, downedSecondsRemaining: 0, eliminationReason: null, respawnSecondsRemaining: 0 });
  }
  getSnapshot = () => this.state;
  getElimination = () => this.elimination;
  getDowner = () => this.downer;
  private recordElimination(tick: number, cause: EliminationFact['cause'], finisher: DamageActor | null) {
    if (this.owner) this.elimination = Object.freeze({ tick, cause, victim: Object.freeze({ ...this.owner, lifeId: this.state.lifeId }), finisher, downer: this.downer });
  }
  /** Call after current-tick damage and before rescue. The deadline never extends. */
  advanceTick(tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    if (matchFinished || tick < this.clockTick || this.spawning) return false;
    if (this.state.status==='downed'&&tick>=this.downedEndTick&&!Number.isSafeInteger(tick+this.protectionTicks)) throw new RangeError('Bubble recovery tick exhausted');
    const before = this.state;
    this.advanceProtection(tick, matchFinished);
    if (this.state.status === 'downed') {
      if (tick >= this.downedEndTick) {
        if (this.life.transition({ type: 'downed_timeout', lifeId: this.state.lifeId, revision: this.state.revision,
          elapsedTicks: this.downedTicks }, matchFinished)) {
          this.protectionEndTick = tick + this.protectionTicks;
          this.downedEndTick = 0; this.downer = null; this.elimination = null;
          this.state = Object.freeze({ ...this.state, ...this.life.getSnapshot(), hp: this.life.config.revivedHp, downedHp: 0, downedSecondsRemaining: 0,
            lastDamage: 0, protected: true, eliminationReason: null, respawnSecondsRemaining: 0 });
        }
      } else {
        const remaining = Math.ceil((this.downedEndTick - tick) / PHYSICS_CONFIG.tickRate);
        if (remaining !== this.state.downedSecondsRemaining) this.state = Object.freeze({ ...this.state, downedSecondsRemaining: remaining });
      }
    }
    if (this.state.status === 'eliminated') {
      const elapsedTicks = tick - this.eliminatedTick;
      if (elapsedTicks >= this.respawnTicks) {
        if (this.life.transition({ type: 'respawn_due', lifeId: this.state.lifeId, revision: this.state.revision, elapsedTicks }, matchFinished)) {
          this.state = Object.freeze({ ...this.state, ...this.life.getSnapshot(), respawnSecondsRemaining: 0 });
        }
      } else {
        const remaining = Math.ceil((this.respawnTicks - elapsedTicks) / PHYSICS_CONFIG.tickRate);
        if (remaining !== this.state.respawnSecondsRemaining) this.state = Object.freeze({ ...this.state, respawnSecondsRemaining: remaining });
      }
    }
    return this.state !== before;
  }
  advanceProtection(tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    if (matchFinished || tick < this.clockTick || this.spawning) return false;
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
    this.downer = null;
    this.state = Object.freeze({ ...current, ...this.life.getSnapshot(), hp: this.life.config.revivedHp, downedHp: 0, lastDamage: 0,
      protected: true, downedSecondsRemaining: 0, eliminationReason: null });
    return true;
  }
  /** Simulation-validated melee finish: caller must prove range/LOS and current target identity. */
  finishBubble(fact: PlayerSpawnIdentity, tick: number, source: DamageActor, matchFinished: boolean) {
    validateData(fact, ['lifeId','revision']); validateTick(tick,matchFinished);
    if(!Number.isSafeInteger(fact.lifeId)||fact.lifeId<1||!Number.isSafeInteger(fact.revision)||fact.revision<0)throw new RangeError('Invalid bubble finish identity');
    const actor=parseDamageActor(source),current=this.state;
    if(matchFinished||tick<this.clockTick||current.status!=='downed'||current.lifeId!==fact.lifeId||current.revision!==fact.revision
      ||this.owner&&(actor.teamId===this.owner.teamId||actor.playerId===this.owner.playerId))return false;
    if(tick>=this.downedEndTick){this.advanceTick(tick,false);return false;}
    if(!this.life.transition({type:'hp_depleted',hp:0,...fact},false))return false;
    this.clockTick=tick;this.eliminatedTick=tick;this.recordElimination(tick,'finishing-damage',actor);
    this.state=Object.freeze({...current,...this.life.getSnapshot(),downedHp:0,downedSecondsRemaining:0,lastDamage:0,protected:false,eliminationReason:'finishing-damage',respawnSecondsRemaining:Math.ceil(this.respawnTicks/PHYSICS_CONFIG.tickRate)});
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
  /** Synchronous authoritative spawn transaction. Preflight map/objects before mutation. */
  completeSpawn(fact: PlayerSpawnIdentity, tick: number, apply: () => boolean, matchFinished: boolean) {
    validateData(fact, ['lifeId', 'revision']); validateTick(tick, matchFinished);
    if (!Number.isSafeInteger(fact.lifeId) || fact.lifeId < 1 || !Number.isSafeInteger(fact.revision) || fact.revision < 0) throw new RangeError('Invalid spawn identity');
    if (typeof apply !== 'function') throw new TypeError('Expected spawn transaction');
    const current = this.state;
    if (this.spawning || matchFinished || tick < this.clockTick || current.status !== 'respawning' || current.lifeId !== fact.lifeId || current.revision !== fact.revision) return false;
    const end = tick + this.spawnProtectionTicks;
    if (!Number.isSafeInteger(end) || !Number.isSafeInteger(current.lifeId + 1) || !Number.isSafeInteger(current.revision + 1)) throw new RangeError('Spawn identity/clock exhausted');
    this.spawning = true;
    try {
      const applied = apply(); if (typeof applied !== 'boolean') throw new TypeError('Expected spawn transaction result'); if (!applied) return false;
      if (!this.life.transition({ type: 'spawn_completed', ...fact }, matchFinished)) return false;
      this.clockTick = tick; this.protectionEndTick = end; this.downedEndTick = 0; this.lastSequence = 0; this.lastTick = tick; this.lastFireSequence = 0;
      this.downer = null; this.elimination = null;
      this.state = Object.freeze({ ...current, ...this.life.getSnapshot(), hp: current.maxHp, downedHp: 0, lastDamage: 0,
        protected: true, downedSecondsRemaining: 0, respawnSecondsRemaining: 0, eliminationReason: null });
      return true;
    } finally { this.spawning = false; }
  }
  /** Identity and resolvedDamage are simulation output, never client-provided hit results. */
  receiveDamage(hit: PlayerDamageIdentity, resolvedDamage: number, matchFinished: boolean, source: DamageActor | null = null): boolean {
    const keys = ['lifeId', 'tick', 'sequence'];
    if (!hit || typeof hit !== 'object' || Array.isArray(hit) || ![Object.prototype, null].includes(Object.getPrototypeOf(hit))
      || Reflect.ownKeys(hit).length !== keys.length || keys.some(key => {
        const descriptor = Object.getOwnPropertyDescriptor(hit, key); return !descriptor || !('value' in descriptor);
      })) throw new TypeError('Invalid player damage identity');
    if (!Number.isSafeInteger(hit.lifeId) || hit.lifeId < 1 || !Number.isSafeInteger(hit.sequence) || hit.sequence < 1
      || !Number.isSafeInteger(hit.tick) || hit.tick < 0) throw new RangeError('Invalid player damage identity values');
    if (!Number.isSafeInteger(resolvedDamage) || resolvedDamage <= 0) throw new RangeError('Expected resolved positive integer damage');
    if (typeof matchFinished !== 'boolean') throw new TypeError('Expected finished gate');
    const actor = source === null ? null : parseDamageActor(source);
    if (actor && this.owner && (actor.playerId === this.owner.playerId || actor.teamId === this.owner.teamId)) return false;
    let current = this.state;
    if (matchFinished || (current.status !== 'normal' && current.status !== 'downed') || hit.lifeId !== current.lifeId
      || hit.sequence <= this.lastSequence || hit.tick < this.lastTick || hit.tick < this.clockTick) return false;
    if (current.status === 'downed' && hit.tick >= this.downedEndTick) { this.advanceTick(hit.tick, matchFinished); return false; }
    if (current.status === 'normal' && !this.isProtected(hit.tick) && resolvedDamage >= current.hp
      && !Number.isSafeInteger(hit.tick + this.downedTicks)) throw new RangeError('Downed deadline exhausted');
    this.advanceProtection(hit.tick, matchFinished); current = this.state;
    if (this.isProtected(hit.tick)) { this.lastSequence = hit.sequence; this.lastTick = hit.tick; return false; }
    if (current.status === 'downed') {
      const lastDamage = Math.min(resolvedDamage, current.downedHp), downedHp = current.downedHp - lastDamage;
      if (downedHp === 0 && !this.life.transition({ type: 'hp_depleted', hp: 0, lifeId: current.lifeId, revision: current.revision }, matchFinished)) return false;
      if (downedHp === 0) this.eliminatedTick = hit.tick;
      if (downedHp === 0) this.recordElimination(hit.tick, 'finishing-damage', actor);
      this.lastSequence = hit.sequence; this.lastTick = hit.tick;
      this.state = Object.freeze({ ...current, ...this.life.getSnapshot(), downedHp, lastDamage,
        downedSecondsRemaining: downedHp === 0 ? 0 : current.downedSecondsRemaining,
        eliminationReason: downedHp === 0 ? 'finishing-damage' : null,
        respawnSecondsRemaining: downedHp === 0 ? Math.ceil(this.respawnTicks / PHYSICS_CONFIG.tickRate) : 0 });
      return true;
    }
    const lastDamage = Math.min(resolvedDamage, current.hp), hp = current.hp - lastDamage;
    const end = hp === 0 ? hit.tick + this.downedTicks : 0;
    if (hp === 0 && !this.life.transition({ type: 'hp_depleted', hp, lifeId: current.lifeId, revision: current.revision }, matchFinished)) return false;
    if (hp === 0) this.downedEndTick = end;
    if (hp === 0) this.downer = actor;
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
