const HEIGHT = 1.8;
const RADIUS = 0.35;

// Body position is the capsule center; feet are height / 2 below it.
export const PLAYER_CONFIG = {
  height: HEIGHT,
  radius: RADIUS,
  capsuleHalfHeight: HEIGHT / 2 - RADIUS,
};
