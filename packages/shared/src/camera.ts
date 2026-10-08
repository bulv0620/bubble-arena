// Follow distance is measured from the shoulder focus point, in metres.
export const CAMERA_CONFIG = {
  distance: 4.5,
  shoulderOffset: 0.55,
  focusHeight: 0.55,
  initialPitch: 25 * Math.PI / 180,
  mouseSensitivity: 0.003,
  rotationResponse: 14,
  // Temporary pole guard; task 2.3 defines the gameplay pitch range.
  poleGuard: 89 * Math.PI / 180,
  fov: 70,
  near: 0.1,
  far: 200,
};
