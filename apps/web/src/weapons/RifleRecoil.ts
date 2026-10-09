import { CAMERA_CONFIG, createRifleRecoilTuning, type RifleRecoilTuning } from '@bubble-arena/shared';
/** Presentation-only offset, isolated from the mouse's desired orientation. */
export class RifleRecoil {
  readonly tuning: RifleRecoilTuning;
  private offset = 0;
  private quietTime = 0;
  private lastSequence = 0;
  constructor(tuning: Partial<RifleRecoilTuning> = {}) { this.tuning = createRifleRecoilTuning(tuning); }
  kick(sequence: number) {
    if (!Number.isSafeInteger(sequence) || sequence <= 0) throw new TypeError('Invalid recoil shot identity');
    if (sequence <= this.lastSequence) return false;
    this.lastSequence = sequence;
    this.quietTime = 0;
    this.offset = Math.min(this.tuning.maxAngle, this.offset + this.tuning.kickAngle);
    return true;
  }
  step(dt: number) {
    if (Number.isFinite(dt) && dt > 0) {
      const previous = Math.max(0, this.quietTime - this.tuning.recoveryDelay);
      this.quietTime += dt;
      const recoveryDt = Math.max(0, this.quietTime - this.tuning.recoveryDelay) - previous;
      this.offset *= Math.exp(-this.tuning.recoveryResponse * recoveryDt);
    }
    if (this.offset < 0.0001) this.offset = 0;
    return this.offset;
  }
  reset() { this.offset = 0; this.quietTime = 0; }
}
export function applyRecoilPitch(angles: { yaw: number; pitch: number }, offset: number) {
  const safe = Number.isFinite(offset) && offset > 0 ? offset : 0;
  return { yaw: angles.yaw, pitch: Math.max(CAMERA_CONFIG.minPitch, Math.min(CAMERA_CONFIG.maxPitch, angles.pitch - safe)) };
}
