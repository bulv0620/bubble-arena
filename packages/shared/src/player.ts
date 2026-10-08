const HEIGHT = 1.8;
const RADIUS = 0.35;
const CONTROLLER_OFFSET = 0.01;

// Metres, seconds, radians. Body position is the capsule center, not the feet.
export const PLAYER_CONFIG = {
  height: HEIGHT,
  radius: RADIUS,
  capsuleHalfHeight: HEIGHT / 2 - RADIUS,
  speed: 5,
  aimSpeed: 3.5,
  turnResponse: 12,
  turnMinSpeed: 0.05,
  acceleration: 25,
  deceleration: 30,
  airControl: 0.35,
  jumpSpeed: 7,
  maxSlopeAngle: Math.PI / 4,
  // Allow float32 contact normals at the inclusive 45-degree boundary.
  slopeAngleTolerance: 0.001,
  maxStepHeight: 0.3,
  minStepWidth: 0.4,
  groundSnapDistance: 0.3,
  // Contact normal thresholds select slope snapping, not jump eligibility.
  slopeSnapMinNormalY: 0.5,
  slopeSnapMaxNormalY: 0.99,
  ceilingDisplacementTolerance: 0.00001,
  ceilingMaxNormalY: -0.5,
  controllerOffset: CONTROLLER_OFFSET,
  // Base contact probe distance; the adapter scales it for the maximum slope.
  groundProbeDistance: CONTROLLER_OFFSET * 2,
  // Start clear of floor contact tolerance; gravity settles onto the controller gap.
  spawnClearance: CONTROLLER_OFFSET * 2,
};

export type MovementTuning = Readonly<Pick<typeof PLAYER_CONFIG,
  'speed' | 'aimSpeed' | 'acceleration' | 'deceleration' | 'airControl' | 'turnResponse' | 'turnMinSpeed'>>;

/** Validated, immutable tuning snapshot. Defaults stay in PLAYER_CONFIG. */
export function createMovementTuning(overrides: Partial<MovementTuning> = {}): MovementTuning {
  const keys = ['speed', 'aimSpeed', 'acceleration', 'deceleration', 'airControl', 'turnResponse', 'turnMinSpeed'] as const;
  const result = {} as Record<typeof keys[number], number>;
  for (const key of keys) {
    const value = overrides[key] === undefined ? PLAYER_CONFIG[key] : overrides[key];
    const valid = Number.isFinite(value) && (key === 'airControl' ? value >= 0 && value <= 1
      : key === 'turnMinSpeed' ? value >= 0 : value > 0);
    if (!valid) throw new RangeError(`Invalid movement tuning: ${key}`);
    result[key] = value;
  }
  return Object.freeze(result);
}
