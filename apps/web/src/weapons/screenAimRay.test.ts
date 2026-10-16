import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_CONFIG, COLLISION_GROUPS, WEAPON_CONFIGS } from '@bubble-arena/shared';
import { createScreenAimRay, queryScreenAimTarget, type ScreenAimRay } from './screenAimRay';
import { updateFollowCamera } from '../camera/cameraFollowPose';
import { avoidCameraObstacles } from '../camera/cameraAvoidance';
import { cameraFocus } from '../camera/cameraFollowPose';

let world: RAPIER.World;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => world?.free());
const origin = { x: 0, y: 1, z: 0 }, direction = { x: 0, y: 0, z: -1 };
const ray = { origin, direction, range: WEAPON_CONFIGS.rifle.range };
function setup() { world = new RAPIER.World({ x: 0, y: 0, z: 0 }); }
function wall(z: number) {
  return world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.1).setTranslation(0, 1, z).setCollisionGroups(COLLISION_GROUPS.map));
}
test.each([false, true])('camera centre target projects to NDC 0/0 in normal/aim mode=%s', aiming => {
  setup(); const camera = new PerspectiveCamera(70, 16 / 9, 0.1, 200);
  for (const aspect of [16 / 9, 4 / 3]) for (const yaw of [0, 1.2, -2.7]) for (const pitch of [-0.8, 0.14, 1]) {
    camera.aspect = aspect;
    updateFollowCamera(camera, { translation: () => origin }, { yaw, pitch }, aiming);
    const sample = createScreenAimRay(camera); expect(sample).not.toBeNull();
    const target = queryScreenAimTarget(world, sample!); expect(target?.status).toBe('clear');
    const projected = new Vector3(target!.point.x, target!.point.y, target!.point.z).project(camera);
    expect(projected.x).toBeCloseTo(0, 10); expect(projected.y).toBeCloseTo(0, 10);
    expect(Math.hypot(sample!.direction.x, sample!.direction.y, sample!.direction.z)).toBeCloseTo(1, 10);
    expect(target!.distance).toBe(70);
  }
});
test('nearest map hit wins, point distance is metres, ray origin inside solid produces zero', () => {
  setup(); wall(-8); const near = wall(-3); world.step();
  const target = queryScreenAimTarget(world, { ...ray, direction: { x: 0, y: 0, z: -5 } });
  expect(target?.status).toBe('hit'); expect(target?.colliderHandle).toBe(near.handle);
  expect(target?.distance).toBeCloseTo(2.9, 5); expect(target?.point.z).toBeCloseTo(-2.9, 5);
  const inside = queryScreenAimTarget(world, { ...ray, origin: { ...origin, z: -3 } });
  expect(inside?.distance).toBe(0); expect(inside?.point).toEqual({ ...origin, z: -3 });
});
test('empty world and out-of-range solid provide finite endpoint and direction', () => {
  setup(); expect(queryScreenAimTarget(world, ray)).toMatchObject({ status: 'clear', distance: 70, point: { x: 0, y: 1, z: -70 }, colliderHandle: null });
  wall(-75); world.step(); expect(queryScreenAimTarget(world, ray)?.status).toBe('clear');
});
test('own capsule, other players, dynamic/kinematic map bodies, sensors and other groups are excluded', () => {
  setup();
  const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, -1));
  world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.35).setCollisionGroups(COLLISION_GROUPS.player), player);
  for (const desc of [RAPIER.RigidBodyDesc.dynamic(), RAPIER.RigidBodyDesc.kinematicPositionBased()]) {
    const body = world.createRigidBody(desc.setTranslation(0, 1, -2));
    world.createCollider(RAPIER.ColliderDesc.cuboid(1, 1, 0.1).setCollisionGroups(COLLISION_GROUPS.map), body);
  }
  wall(-3).setSensor(true); wall(-4).setCollisionGroups(COLLISION_GROUPS.testCube);
  const solid = wall(-5); world.step();
  expect(queryScreenAimTarget(world, ray)?.colliderHandle).toBe(solid.handle);
  world.removeCollider(solid, false); world.step(); expect(queryScreenAimTarget(world, ray)?.status).toBe('clear');
});
test('invalid camera/ray rejects instead of publishing NaN or stale target', () => {
  setup(); const camera = new PerspectiveCamera();
  for (const range of [NaN, Infinity, 0, -1]) expect(createScreenAimRay(camera, range)).toBeNull();
  camera.fov = 0; expect(createScreenAimRay(camera)).toBeNull(); camera.fov = 50;
  camera.position.x = NaN; expect(createScreenAimRay(camera)).toBeNull(); camera.position.x = 0;
  camera.quaternion.set(0, 0, 0, 0); expect(createScreenAimRay(camera)).toBeNull();
  for (const invalid of [{ ...ray, range: Infinity }, { ...ray, origin: null }, { ...ray, origin: { ...origin, y: NaN } },
    { ...ray, direction: { x: 0, y: 0, z: 0 } }, { ...ray, direction: { ...direction, x: Infinity } }, null]) {
    expect(queryScreenAimTarget(world, invalid as unknown as ScreenAimRay)).toBeNull();
  }
});
test('uses camera world pose, immutable results and does not mutate camera/ray/world', () => {
  setup(); wall(-3); world.step();
  const camera = new PerspectiveCamera(), parent = new Object3D(); parent.position.set(3, 2, 1); parent.rotation.y = 0.7; parent.add(camera);
  const position = camera.position.toArray(), rotation = camera.quaternion.toArray(), before = JSON.stringify(ray);
  const expected = camera.getWorldPosition(new Vector3());
  expect(createScreenAimRay(camera)?.origin).toEqual({ x: expected.x, y: expected.y, z: expected.z });
  const count = [world.bodies.len(), world.colliders.len()];
  for (let i = 0; i < 20; i++) {
    const sample = queryScreenAimTarget(world, ray)!;
    expect(Object.isFrozen(sample)).toBe(true); expect(Object.isFrozen(sample.point)).toBe(true);
    expect(Object.isFrozen(sample.origin)).toBe(true); expect(Object.isFrozen(sample.direction)).toBe(true);
  }
  expect(camera.position.toArray()).toEqual(position); expect(camera.quaternion.toArray()).toEqual(rotation);
  expect(JSON.stringify(ray)).toBe(before); expect([world.bodies.len(), world.colliders.len()]).toEqual(count);
});
test('ray follows final obstacle-contracted camera, not its original desired position', () => {
  setup(); world.createCollider(RAPIER.ColliderDesc.cuboid(5, 4, 0.1).setTranslation(0, 1, 1.5).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
  const camera = new PerspectiveCamera(70, 16 / 9, 0.1, 200), position = { x: 0, y: 0, z: 0 };
  updateFollowCamera(camera, { translation: () => position }, { yaw: 0, pitch: 0.14 });
  const ideal = camera.position.clone();
  expect(avoidCameraObstacles(world, camera, { x: 0, y: CAMERA_CONFIG.focusHeight, z: 0 }, cameraFocus(position, 0)).status).toBe('resolved');
  expect(camera.position.distanceTo(ideal)).toBeGreaterThan(1);
  const actual = createScreenAimRay(camera)!;
  expect(actual.origin).toEqual({ x: camera.position.x, y: camera.position.y, z: camera.position.z });
  const target = queryScreenAimTarget(world, actual)!;
  const projected = new Vector3(target.point.x, target.point.y, target.point.z).project(camera);
  expect(projected.x).toBeCloseTo(0, 10); expect(projected.y).toBeCloseTo(0, 10);
});
