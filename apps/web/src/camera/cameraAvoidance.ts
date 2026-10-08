import type { World, Vector } from '@dimforge/rapier3d-compat';
import { Vector3, type PerspectiveCamera } from 'three';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { detectCameraObstacle, isCameraPositionBlocked } from './cameraObstacleProbe';
import type { CameraDistanceRecovery } from './CameraDistanceRecovery';

/** Contracts immediately, then optionally restores distance along the current safe orbit. */
export function avoidCameraObstacles(world: World, camera: PerspectiveCamera, anchor: Vector, shoulder: Vector,
  recovery?: CameraDistanceRecovery, dt = 0) {
  const ideal = camera.position.clone();
  if (![anchor.x, anchor.y, anchor.z, shoulder.x, shoulder.y, shoulder.z,
    ideal.x, ideal.y, ideal.z].every(Number.isFinite)) return { status: 'invalid' as const };
  // Do not attempt to escape from a player anchor already inside static geometry.
  if (isCameraPositionBlocked(world, anchor)) return { status: 'blocked-anchor' as const };
  const shoulderProbe = detectCameraObstacle(world, anchor, shoulder);
  if (shoulderProbe.status === 'invalid') return { status: 'invalid' as const };
  const focus = new Vector3(shoulder.x, shoulder.y, shoulder.z);
  if (shoulderProbe.status === 'hit') {
    const fraction = Math.max(0, shoulderProbe.distance - CAMERA_CONFIG.obstacleContactEpsilon) / shoulderProbe.length;
    focus.set(anchor.x, anchor.y, anchor.z).lerp(new Vector3(shoulder.x, shoulder.y, shoulder.z), fraction);
  }
  // Preserve the requested orbit direction after pulling the shoulder back from a wall.
  ideal.add(new Vector3(focus.x - shoulder.x, focus.y - shoulder.y, focus.z - shoulder.z));
  const obstruction = detectCameraObstacle(world, focus, ideal);
  if (obstruction.status === 'invalid') return { status: 'invalid' as const };
  const safeDistance = obstruction.status === 'hit'
    ? Math.max(0, obstruction.distance - CAMERA_CONFIG.obstacleContactEpsilon) : obstruction.length;
  const plan = recovery?.preview(safeDistance, dt);
  if (recovery && !plan) return { status: 'invalid' as const };
  const distance = plan?.distance ?? safeDistance;
  const candidate = focus.clone().lerp(ideal, distance / obstruction.length);
  if (isCameraPositionBlocked(world, candidate)) return { status: 'blocked-anchor' as const };
  camera.position.copy(candidate);
  if (recovery && plan) recovery.commit(plan);
  // Translation along the orbit ray keeps its orientation, including zero-length contraction.
  return { status: 'resolved' as const, focus, distance, safeDistance, shoulderProbe, obstruction };
}
