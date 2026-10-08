import { CAMERA_CONFIG } from '@bubble-arena/shared';
import type { PerspectiveCamera } from 'three';
import type { OrbitAngles } from './MouseOrbit';

export interface CameraFollowTarget {
  translation(): { x: number; y: number; z: number };
}

export function cameraFocus(position: { x: number; y: number; z: number }, yaw: number) {
  return {
    x: position.x + Math.cos(yaw) * CAMERA_CONFIG.shoulderOffset,
    y: position.y + CAMERA_CONFIG.focusHeight,
    z: position.z - Math.sin(yaw) * CAMERA_CONFIG.shoulderOffset,
  };
}

/** Updates only presentation; never writes back to the target or physics world. */
export function updateFollowCamera(camera: PerspectiveCamera, target: CameraFollowTarget | null,
  angles: OrbitAngles = { yaw: 0, pitch: CAMERA_CONFIG.initialPitch }) {
  if (!target) return false;
  const position = target.translation();
  if (![position.x, position.y, position.z, angles.yaw, angles.pitch].every(Number.isFinite)) return false;
  const { x: focusX, y: focusY, z: focusZ } = cameraFocus(position, angles.yaw);
  const horizontal = Math.cos(angles.pitch) * CAMERA_CONFIG.distance;
  camera.position.set(
    focusX + Math.sin(angles.yaw) * horizontal,
    focusY + Math.sin(angles.pitch) * CAMERA_CONFIG.distance,
    focusZ + Math.cos(angles.yaw) * horizontal,
  );
  camera.lookAt(focusX, focusY, focusZ);
  return true;
}
