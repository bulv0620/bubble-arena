import { CAMERA_CONFIG } from '@bubble-arena/shared';
import type { PerspectiveCamera } from 'three';
import type { OrbitAngles } from './MouseOrbit';

export interface CameraFollowTarget {
  translation(): { x: number; y: number; z: number };
}

/** Updates only presentation; never writes back to the target or physics world. */
export function updateFollowCamera(camera: PerspectiveCamera, target: CameraFollowTarget | null,
  angles: OrbitAngles = { yaw: 0, pitch: CAMERA_CONFIG.initialPitch }) {
  if (!target) return false;
  const position = target.translation();
  if (![position.x, position.y, position.z, angles.yaw, angles.pitch].every(Number.isFinite)) return false;
  const focusX = position.x + Math.cos(angles.yaw) * CAMERA_CONFIG.shoulderOffset;
  const focusY = position.y + CAMERA_CONFIG.focusHeight;
  const focusZ = position.z - Math.sin(angles.yaw) * CAMERA_CONFIG.shoulderOffset;
  const horizontal = Math.cos(angles.pitch) * CAMERA_CONFIG.distance;
  camera.position.set(
    focusX + Math.sin(angles.yaw) * horizontal,
    focusY + Math.sin(angles.pitch) * CAMERA_CONFIG.distance,
    focusZ + Math.cos(angles.yaw) * horizontal,
  );
  camera.lookAt(focusX, focusY, focusZ);
  return true;
}
