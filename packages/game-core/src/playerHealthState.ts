import { PLAYER_LIFE_CONFIG, PLAYER_VITALS_CONFIG, type PlayerLifeConfig, type PlayerLifeSnapshot } from '@bubble-arena/shared';
import { PlayerLifeMachine } from './playerLifeMachine';
import type { PlayerVitals } from './playerVitals';

/** sequence is the victim's resolved-hit order, not an individual attacker's shot counter. */
export interface PlayerDamageIdentity { readonly lifeId: number; readonly tick: number; readonly sequence: number }
export interface PlayerHealthSnapshot extends PlayerVitals, PlayerLifeSnapshot {
  readonly downedHp: number;
  readonly maxDownedHp: number;
  readonly lastDamage: number;
}
/** Authoritative standing-health damage only; downed finishing/timers follow in 4.5. */
export class PlayerHealthState {
  private readonly life: PlayerLifeMachine;
  private state: PlayerHealthSnapshot;
  private lastSequence = 0;
  private lastTick = -1;
  constructor(lifeId = 1, config: PlayerLifeConfig = PLAYER_LIFE_CONFIG) {
    this.life = new PlayerLifeMachine(lifeId, config);
    this.state = Object.freeze({ ...this.life.getSnapshot(), hp: PLAYER_VITALS_CONFIG.maxHp, maxHp: PLAYER_VITALS_CONFIG.maxHp,
      downedHp: 0, maxDownedHp: this.life.config.downedHp, lastDamage: 0 });
  }
  getSnapshot = () => this.state;
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
    const current = this.state;
    if (matchFinished || current.status !== 'normal' || hit.lifeId !== current.lifeId
      || hit.sequence <= this.lastSequence || hit.tick < this.lastTick) return false;
    const lastDamage = Math.min(resolvedDamage, current.hp), hp = current.hp - lastDamage;
    if (hp === 0 && !this.life.transition({ type: 'hp_depleted', hp, lifeId: current.lifeId, revision: current.revision }, matchFinished)) return false;
    this.lastSequence = hit.sequence; this.lastTick = hit.tick;
    this.state = Object.freeze({ ...current, ...this.life.getSnapshot(), hp, lastDamage,
      downedHp: hp === 0 ? current.maxDownedHp : 0 });
    return true;
  }
}
