import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { CAMERA_CONFIG, COLLISION_GROUPS, WHITEBOX_CONFIG, WHITEBOX_SOLIDS } from '@bubble-arena/shared';
import { avoidCameraObstacles } from './cameraAvoidance';
import { cameraFocus, updateFollowCamera } from './cameraFollowPose';
import { CameraDistanceRecovery } from './CameraDistanceRecovery';

test('removing and restoring a real wall recovers gradually, then immediately contracts safely', () => {
  setup();
  let wall = box(0, 1, 2, 1, 1, 0.1); world.step();
  const recovery = new CameraDistanceRecovery(), camera = new PerspectiveCamera();
  const position = { x: -0.55, y: 0.45, z: 0 };
  const frame = (dt: number) => {
    updateFollowCamera(camera, { translation: () => position }, { yaw: 0, pitch: 0 });
    const result = avoidCameraObstacles(world, camera, { x: -0.55, y: 1, z: 0 }, cameraFocus(position, 0), recovery, dt);
    if (result.status !== 'resolved') throw new Error('expected resolved');
    expectOutside(camera);
    return result.distance;
  };
  let distance = frame(0);
  world.removeCollider(wall, false); world.step();
  for (let i = 0; i < 30; i++) {
    const next = frame(1 / 60);
    expect(next).toBeGreaterThanOrEqual(distance);
    expect(next).toBeLessThan(4.5);
    distance = next;
  }
  expect(distance).toBeGreaterThan(3.9);
  wall = box(0, 1, 1, 1, 1, 0.1); world.step();
  expect(frame(1 / 60)).toBeLessThan(0.65);
  world.removeCollider(wall, false); world.step();
  for (let i = 0; i < 180; i++) distance = frame(1 / 60);
  expect(distance).toBe(4.5);
});

let world: RAPIER.World;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => world?.free());
function setup() { world = new RAPIER.World({ x: 0, y: 0, z: 0 }); }
function box(x: number, y: number, z: number, hx: number, hy: number, hz: number) {
  return world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z)
    .setCollisionGroups(COLLISION_GROUPS.map));
}
function apply(position = { x: -0.55, y: 0.45, z: 0 }, yaw = 0, pitch = 0) {
  const camera = new PerspectiveCamera(CAMERA_CONFIG.fov, 16 / 9, CAMERA_CONFIG.near, CAMERA_CONFIG.far);
  updateFollowCamera(camera, { translation: () => position }, { yaw, pitch });
  const rotation = camera.quaternion.toArray();
  const result = avoidCameraObstacles(world, camera,
    { x: position.x, y: position.y + CAMERA_CONFIG.focusHeight, z: position.z }, cameraFocus(position, yaw));
  expect(camera.quaternion.toArray()).toEqual(rotation);
  return { camera, result };
}
function expectOutside(camera: PerspectiveCamera) {
  expect(world.intersectionWithShape(camera.position, { x: 0, y: 0, z: 0, w: 1 },
    new RAPIER.Ball(CAMERA_CONFIG.obstacleRadius + CAMERA_CONFIG.obstacleClearance),
    undefined, COLLISION_GROUPS.player)).toBeNull();
}

test('clear orbit keeps 4.5m; a wall immediately contracts without double-counting clearance', () => {
  setup(); world.step();
  expect(apply().result).toMatchObject({ status: 'resolved', distance: 4.5 });
  box(0, 1, 2, 1, 1, 0.1); world.step();
  const { camera, result } = apply();
  expect(result.status).toBe('resolved');
  if (result.status !== 'resolved') throw new Error('expected resolved');
  expect(result.distance).toBeCloseTo(1.9 - 0.2 - 0.05 - CAMERA_CONFIG.obstacleContactEpsilon, 3);
  expect(camera.position.z).toBeCloseTo(result.distance, 6);
  expectOutside(camera);
});

test('negative pitch stops the camera above the floor with its safety envelope clear', () => {
  setup(); box(0, -0.5, 0, 40, 0.5, 40); world.step();
  const { camera, result } = apply({ x: -2, y: 0.91, z: 0 }, 0, CAMERA_CONFIG.minPitch);
  expect(result.status).toBe('resolved');
  expect(camera.position.y).toBeGreaterThan(0.25);
  expect(camera.position.y).toBeLessThan(0.26);
  expectOutside(camera);
});

test('shoulder crossing the wall is pulled back before the orbit sweep', () => {
  setup(); box(0.6, 1, 0, 0.1, 2, 10); world.step();
  const { camera, result } = apply({ x: 0, y: 0.45, z: 0 });
  expect(result.status).toBe('resolved');
  if (result.status !== 'resolved') throw new Error('expected resolved');
  expect(result.shoulderProbe.status).toBe('hit');
  expect(result.focus.x).toBeCloseTo(0.25 - CAMERA_CONFIG.obstacleContactEpsilon, 3);
  expect(camera.position.x).toBeCloseTo(result.focus.x);
  expectOutside(camera);
});

test('a very close obstruction never enforces a minimum distance through a wall', () => {
  setup(); box(0, 1, 0.2515, 1, 2, 0.001); world.step();
  const { camera, result } = apply();
  expect(result.status).toBe('resolved');
  if (result.status !== 'resolved') throw new Error('expected resolved');
  expect(result.distance).toBeLessThan(0.001);
  expect(result.distance).toBeGreaterThanOrEqual(0);
  expect(camera.quaternion.toArray().every(Number.isFinite)).toBe(true);
  expectOutside(camera);
});

test('invalid input or embedded anchor refuses relocation and preserves the supplied camera', () => {
  setup(); box(0, 1, 0, 1, 1, 1); world.step();
  const camera = new PerspectiveCamera(); camera.position.set(8, 8, 8);
  const saved = camera.position.clone();
  expect(avoidCameraObstacles(world, camera, { x: NaN, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }).status).toBe('invalid');
  expect(avoidCameraObstacles(world, camera, { x: 0, y: 1, z: 0 }, { x: 0.55, y: 1, z: 0 }).status).toBe('blocked-anchor');
  expect(camera.position).toEqual(saved);
});

test('full-map wall, corner, box and ramp poses remain outside geometry over yaw and pitch sweeps', () => {
  setup();
  box(0, -WHITEBOX_CONFIG.groundThickness / 2, 0, 40, WHITEBOX_CONFIG.groundThickness / 2, 40);
  for (const solid of WHITEBOX_SOLIDS) {
    const collider = box(...solid.position, solid.size[0] / 2, solid.size[1] / 2, solid.size[2] / 2);
    collider.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), solid.rotationZ ?? 0));
  }
  world.step();
  const bodies = world.bodies.len(), colliders = world.colliders.len();
  for (const position of [
    { x: -2, y: 0.91, z: 0 }, { x: -2.64, y: 0.91, z: -2.39 },
    { x: 0.62, y: 0.91, z: 1.5 }, { x: 5.23, y: 1.77, z: 0 },
  ]) {
    const saved = { ...position };
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 12) {
      for (const pitch of [CAMERA_CONFIG.minPitch, 0, CAMERA_CONFIG.initialPitch, CAMERA_CONFIG.maxPitch]) {
        const { camera, result } = apply(position, yaw, pitch);
        expect(result.status, JSON.stringify({ position, yaw, pitch, result })).toBe('resolved');
        expectOutside(camera);
      }
    }
    expect(position).toEqual(saved);
  }
  expect(world.bodies.len()).toBe(bodies);
  expect(world.colliders.len()).toBe(colliders);
});
