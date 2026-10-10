// Follow distance is measured from the shoulder focus point, in metres.
export const CAMERA_CONFIG = {
  distance: 4.5,
  shoulderOffset: 1.12,
  aimShoulderOffset: 1.12,
  aimDistance: 4.5,
  aimFov: 70,
  focusHeight: 1.7,
  initialPitch: 8 * Math.PI / 180,
  mouseSensitivity: 0.003,
  // Positive pitch places the camera above the shoulder focus (looking down).
  minPitch: -60 * Math.PI / 180,
  maxPitch: 70 * Math.PI / 180,
  obstacleRadius: 0.2,
  obstacleClearance: 0.05,
  obstacleContactEpsilon: 0.001,
  recoveryResponse: 5,
  recoveryDelay: 0.1,
  recoveryMaxDelta: 0.1,
  recoveryEpsilon: 0.005,
  fov: 70,
  near: 0.1,
  far: 200,
};
