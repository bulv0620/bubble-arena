const HEIGHT = 1.8;
const RADIUS = 0.35;
const CONTROLLER_OFFSET = 0.01;

// Body position is the capsule center; feet are height / 2 below it.
export const PLAYER_CONFIG = {
  height: HEIGHT,
  radius: RADIUS,
  capsuleHalfHeight: HEIGHT / 2 - RADIUS,
  speed: 5,
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
  controllerOffset: CONTROLLER_OFFSET,
  // Probe only the controller's contact gap, without granting a ledge grace period.
  groundProbeDistance: CONTROLLER_OFFSET * 2,
  // Start clear of floor contact tolerance; gravity settles onto the controller gap.
  spawnClearance: CONTROLLER_OFFSET * 2,
};
