export interface RifleRecoilTuning { readonly kickAngle: number; readonly maxAngle: number; readonly recoveryResponse: number; readonly recoveryDelay: number; readonly pulseAngle: number; readonly maxPulseAngle: number; readonly pulseRecoveryResponse: number }
/** Radians and inverse seconds; initial feel awaits playtest. */
export const RIFLE_RECOIL_CONFIG: RifleRecoilTuning = Object.freeze({
  kickAngle: 1.2 * Math.PI / 180, maxAngle: 6 * Math.PI / 180, recoveryResponse: 9, recoveryDelay: .16,
  pulseAngle: .65 * Math.PI / 180, maxPulseAngle: .85 * Math.PI / 180, pulseRecoveryResponse: 26,
});
export function createRifleRecoilTuning(overrides: Partial<RifleRecoilTuning> = {}): RifleRecoilTuning {
  const tuning = { ...RIFLE_RECOIL_CONFIG, ...overrides };
  if (![tuning.kickAngle, tuning.maxAngle, tuning.recoveryResponse, tuning.recoveryDelay, tuning.pulseAngle, tuning.maxPulseAngle, tuning.pulseRecoveryResponse].every(Number.isFinite)
    || tuning.kickAngle < 0 || tuning.maxAngle < tuning.kickAngle || tuning.maxAngle > Math.PI / 2
    || tuning.pulseAngle < 0 || tuning.maxPulseAngle < tuning.pulseAngle || tuning.maxPulseAngle > Math.PI / 12 || tuning.pulseRecoveryResponse <= 0
    || tuning.recoveryResponse <= 0 || tuning.recoveryDelay < 0 || tuning.recoveryDelay > 2) throw new RangeError('Invalid recoil tuning');
  return Object.freeze(tuning);
}
