const HEIGHT = 1.8;
const RADIUS = 0.35;
const CONTROLLER_OFFSET = 0.01;

// Metres, seconds, radians. Body position is the capsule center, not the feet.
export const PLAYER_CONFIG = {
  height: HEIGHT,
  radius: RADIUS,
  capsuleHalfHeight: HEIGHT / 2 - RADIUS,
  speed: 5,
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
