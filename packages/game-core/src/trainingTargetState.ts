import { TRAINING_TARGET_CONFIG } from '@bubble-arena/shared';

export interface TrainingHit { readonly tick: number; readonly sequence: number }
export interface TrainingTargetSnapshot {
  readonly hp: number; readonly maxHp: number; readonly hitCount: number; readonly lastHitTick: number | null;
}
/** 3.8 receive-hit boundary only; damage belongs to 3.9, not this test fixture. */
export class TrainingTargetState {
  private state: TrainingTargetSnapshot;
  private lastSequence = 0;
  constructor(maxHp: number = TRAINING_TARGET_CONFIG.maxHp) {
    if (!Number.isSafeInteger(maxHp) || maxHp <= 0) throw new RangeError('Expected positive safe-integer target HP');
    this.state = Object.freeze({ hp: maxHp, maxHp, hitCount: 0, lastHitTick: null });
  }
  getState = () => this.state;
  receiveHit(hit: TrainingHit) {
    if (!hit || !Number.isSafeInteger(hit.tick) || hit.tick < 0 || !Number.isSafeInteger(hit.sequence) || hit.sequence <= 0) {
      throw new TypeError('Expected valid local shot identity');
    }
    if (hit.sequence <= this.lastSequence || (this.state.lastHitTick !== null && hit.tick < this.state.lastHitTick)) return false;
    this.lastSequence = hit.sequence;
    this.state = Object.freeze({ ...this.state, hitCount: this.state.hitCount + 1, lastHitTick: hit.tick });
    return true;
  }
}
