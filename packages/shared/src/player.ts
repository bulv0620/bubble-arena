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
  controllerOffset: CONTROLLER_OFFSET,
  // Horizontal-only prototype starts clear of floor contact tolerance.
  spawnClearance: CONTROLLER_OFFSET * 2,
};
