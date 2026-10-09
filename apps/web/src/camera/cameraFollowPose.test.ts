import { expect, test } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { updateFollowCamera } from './cameraFollowPose';

test('orbit rotates shoulder offset and retains distance, focus and upright orientation', () => {
  const camera = new PerspectiveCamera();
  const position = { x: 2, y: 3, z: 4 };
  for (const yaw of [0, Math.PI / 2, -Math.PI, 2.8]) {
    for (const pitch of [CAMERA_CONFIG.minPitch, 0, CAMERA_CONFIG.maxPitch]) {
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

test('right button retains the same camera pose and projection', () => {
  expect(CAMERA_CONFIG.aimDistance).toBe(CAMERA_CONFIG.distance);
  expect(CAMERA_CONFIG.aimShoulderOffset).toBe(CAMERA_CONFIG.shoulderOffset);
  expect(CAMERA_CONFIG.aimFov).toBe(CAMERA_CONFIG.fov);
  const camera = new PerspectiveCamera(CAMERA_CONFIG.fov);
  const position = { x: 2, y: 1, z: 4 }, target = { translation: () => position };
  for (const yaw of [0, Math.PI / 2, -Math.PI]) {
    for (const aiming of [false, true, false]) {
      expect(updateFollowCamera(camera, target, { yaw, pitch: 0.3 }, aiming)).toBe(true);
      const offset = aiming ? CAMERA_CONFIG.aimShoulderOffset : CAMERA_CONFIG.shoulderOffset;
      const focus = new Vector3(position.x + Math.cos(yaw) * offset,
        position.y + CAMERA_CONFIG.focusHeight, position.z - Math.sin(yaw) * offset);
      expect(camera.position.distanceTo(focus)).toBeCloseTo(aiming ? CAMERA_CONFIG.aimDistance : CAMERA_CONFIG.distance, 10);
      expect(camera.fov).toBe(aiming ? CAMERA_CONFIG.aimFov : CAMERA_CONFIG.fov);
      expect(camera.getWorldDirection(new Vector3()).distanceTo(focus.sub(camera.position).normalize())).toBeLessThan(1e-10);
    }
  }
  const projection = camera.projectionMatrix.clone();
  expect(updateFollowCamera(camera, null, { yaw: 0, pitch: 0 }, true)).toBe(false);
  expect(camera.fov).toBe(CAMERA_CONFIG.fov); expect(camera.projectionMatrix).toEqual(projection);
  expect(position).toEqual({ x: 2, y: 1, z: 4 });
});

test('default framing keeps the head below the center reticle and the full body in view', () => {
  const position = { x: -2, y: 0.91, z: 0 };
  for (const aspect of [16 / 9, 4 / 3]) {
    for (const aiming of [false, true]) {
      const camera = new PerspectiveCamera(CAMERA_CONFIG.fov, aspect, CAMERA_CONFIG.near, CAMERA_CONFIG.far);
      updateFollowCamera(camera, { translation: () => position }, undefined, aiming);
      camera.updateMatrixWorld();
      const head = new Vector3(position.x, position.y + 0.9, position.z).project(camera);
      const foot = new Vector3(position.x, position.y - 0.9, position.z).project(camera);
      expect(head.x).toBeLessThan(-0.05); // Player stays left of the viewing center.
      expect(head.y).toBeLessThan(-0.05); // Viewing center is above the head.
      expect(foot.y).toBeGreaterThan(-1);
      expect((head.y - foot.y) / 2).toBeLessThan(0.5); // No majority-screen capsule while aiming.
    }
  }
});
