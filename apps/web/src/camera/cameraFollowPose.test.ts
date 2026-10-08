import { expect, test } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { updateFollowCamera } from './cameraFollowPose';

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
