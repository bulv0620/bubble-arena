import { expect, test } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { updateFollowCamera } from './cameraFollowPose';

test('orbit rotates shoulder offset and retains distance, focus and upright orientation', () => {
  const camera = new PerspectiveCamera();
  const position = { x: 2, y: 3, z: 4 };
  for (const yaw of [0, Math.PI / 2, -Math.PI, 2.8]) {
    for (const pitch of [-CAMERA_CONFIG.poleGuard, 0, CAMERA_CONFIG.poleGuard]) {
      expect(updateFollowCamera(camera, { translation: () => position }, { yaw, pitch })).toBe(true);
      const focus = new Vector3(position.x + Math.cos(yaw) * CAMERA_CONFIG.shoulderOffset,
        position.y + CAMERA_CONFIG.focusHeight, position.z - Math.sin(yaw) * CAMERA_CONFIG.shoulderOffset);
      expect(camera.position.distanceTo(focus)).toBeCloseTo(4.5, 10);
      expect(camera.getWorldDirection(new Vector3()).distanceTo(focus.sub(camera.position).normalize())).toBeLessThan(1e-10);
      expect(new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).y).toBeGreaterThan(0);
    }
  }
  const saved = camera.position.clone();
  expect(updateFollowCamera(camera, { translation: () => position }, { yaw: NaN, pitch: 0 })).toBe(false);
  expect(camera.position).toEqual(saved);
});

test('walking and jumping keep the same shoulder-relative pose and distance', () => {
  const camera = new PerspectiveCamera(CAMERA_CONFIG.fov);
  let position = { x: -2, y: 0.91, z: 0 };
  const target = { translation: () => position };
  updateFollowCamera(camera, target);
  const initialOffset = camera.position.clone().sub(new Vector3(position.x, position.y, position.z));
  for (const next of [{ x: 5, y: 0.91, z: -8 }, { x: 5, y: 2.1, z: -8 }, { x: 7, y: 4, z: 3 }]) {
    position = next;
    const snapshot = { ...position };
    expect(updateFollowCamera(camera, target)).toBe(true);
    const focus = new Vector3(position.x + CAMERA_CONFIG.shoulderOffset, position.y + CAMERA_CONFIG.focusHeight, position.z);
    expect(camera.position.distanceTo(focus)).toBeCloseTo(CAMERA_CONFIG.distance, 10);
    expect(camera.position.clone().sub(new Vector3(position.x, position.y, position.z)).distanceTo(initialOffset)).toBeLessThan(1e-10);
    expect(camera.getWorldDirection(new Vector3()).distanceTo(focus.sub(camera.position).normalize())).toBeLessThan(1e-10);
    expect(position).toEqual(snapshot); // Presentation cannot mutate the physics target.
  }
});

test('missing or invalid target retains the last valid camera pose; remount uses the new target', () => {
  const camera = new PerspectiveCamera();
  updateFollowCamera(camera, { translation: () => ({ x: 1, y: 2, z: 3 }) });
  const position = camera.position.clone();
  const rotation = camera.quaternion.clone();
  expect(updateFollowCamera(camera, null)).toBe(false);
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(updateFollowCamera(camera, { translation: () => ({ x: value, y: 0, z: 0 }) })).toBe(false);
  }
  expect(camera.position).toEqual(position);
  expect(camera.quaternion.toArray()).toEqual(rotation.toArray());
  expect(updateFollowCamera(camera, { translation: () => ({ x: 20, y: 1, z: -30 }) })).toBe(true);
  expect(camera.position.x).toBeCloseTo(20 + CAMERA_CONFIG.shoulderOffset);
});
