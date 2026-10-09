export interface RifleRecoilTuning { readonly kickAngle: number; readonly maxAngle: number; readonly recoveryResponse: number; readonly recoveryDelay: number }
/** Radians and inverse seconds; initial feel awaits playtest. */
export const RIFLE_RECOIL_CONFIG: RifleRecoilTuning = Object.freeze({
  kickAngle: 1.2 * Math.PI / 180, maxAngle: 6 * Math.PI / 180, recoveryResponse: 9, recoveryDelay: .16,
});
export function createRifleRecoilTuning(overrides: Partial<RifleRecoilTuning> = {}): RifleRecoilTuning {
  const tuning = { ...RIFLE_RECOIL_CONFIG, ...overrides };
  if (![tuning.kickAngle, tuning.maxAngle, tuning.recoveryResponse, tuning.recoveryDelay].every(Number.isFinite)
    || tuning.kickAngle < 0 || tuning.maxAngle < tuning.kickAngle || tuning.maxAngle > Math.PI / 2
    || tuning.recoveryResponse <= 0 || tuning.recoveryDelay < 0 || tuning.recoveryDelay > 2) throw new RangeError('Invalid recoil tuning');
  return Object.freeze(tuning);
}
