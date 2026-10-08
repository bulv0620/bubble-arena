import { CAMERA_CONFIG } from '@bubble-arena/shared';
import type { PerspectiveCamera } from 'three';

export interface CameraFollowTarget {
  translation(): { x: number; y: number; z: number };
}

/** Updates only presentation; never writes back to the target or physics world. */
export function updateFollowCamera(camera: PerspectiveCamera, target: CameraFollowTarget | null) {
  if (!target) return false;
  const position = target.translation();
  if (![position.x, position.y, position.z].every(Number.isFinite)) return false;
  const focusX = position.x + CAMERA_CONFIG.shoulderOffset;
  const focusY = position.y + CAMERA_CONFIG.focusHeight;
  camera.position.set(
    focusX,
    focusY + Math.sin(CAMERA_CONFIG.initialPitch) * CAMERA_CONFIG.distance,
    position.z + Math.cos(CAMERA_CONFIG.initialPitch) * CAMERA_CONFIG.distance,
  );
  camera.lookAt(focusX, focusY, position.z);
  return true;
}
