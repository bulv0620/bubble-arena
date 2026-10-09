import { TRAINING_TARGET_CONFIG, WEAPON_CONFIGS } from '@bubble-arena/shared';

export interface TrainingHit { readonly tick: number; readonly sequence: number }
export interface TrainingTargetSnapshot {
  readonly hp: number; readonly maxHp: number; readonly hitCount: number; readonly lastHitTick: number | null; readonly lastDamage: number;
}
/** Local rifle test fixture; future authority runs this rule, never trusts client damage. */
export class TrainingTargetState {
  private state: TrainingTargetSnapshot;
  private lastSequence = 0;
  constructor(maxHp: number = TRAINING_TARGET_CONFIG.maxHp, private readonly damage: number = WEAPON_CONFIGS.rifle.damage) {
    if (!Number.isSafeInteger(maxHp) || maxHp <= 0) throw new RangeError('Expected positive safe-integer target HP');
    if (!Number.isFinite(damage) || damage <= 0) throw new RangeError('Expected positive finite damage');
    this.state = Object.freeze({ hp: maxHp, maxHp, hitCount: 0, lastHitTick: null, lastDamage: 0 });
  }
  getState = () => this.state;
  receiveHit(hit: TrainingHit) {
    if (!hit || !Number.isSafeInteger(hit.tick) || hit.tick < 0 || !Number.isSafeInteger(hit.sequence) || hit.sequence <= 0) {
      throw new TypeError('Expected valid local shot identity');
    }
    if (this.state.hp === 0 || hit.sequence <= this.lastSequence || (this.state.lastHitTick !== null && hit.tick < this.state.lastHitTick)) return false;
    this.lastSequence = hit.sequence;
    const lastDamage = Math.min(this.damage, this.state.hp);
    this.state = Object.freeze({ ...this.state, hp: this.state.hp - lastDamage, lastDamage,
      hitCount: this.state.hitCount + 1, lastHitTick: hit.tick });
    return true;
  }
}
