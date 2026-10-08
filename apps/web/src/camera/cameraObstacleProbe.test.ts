import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PerspectiveCamera } from 'three';
import { CAMERA_CONFIG, COLLISION_GROUPS } from '@bubble-arena/shared';
import { detectCameraObstacle } from './cameraObstacleProbe';
import { cameraFocus, updateFollowCamera } from './cameraFollowPose';

let world: RAPIER.World;
const origin = { x: 0, y: 1, z: 0 }, ideal = { x: 0, y: 1, z: 4.5 };
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => world?.free());
function setup() { world = new RAPIER.World({ x: 0, y: 0, z: 0 }); }
function wall(z: number, x = 0, halfWidth = 1) {
  return world.createCollider(RAPIER.ColliderDesc.cuboid(halfWidth, 1, 0.1)
    .setTranslation(x, 1, z).setCollisionGroups(COLLISION_GROUPS.map));
}

test('sphere reports nearest wall travel in metres including configured clearance', () => {
  setup(); wall(3); const near = wall(2); world.step();
  const hit = detectCameraObstacle(world, origin, ideal);
  expect(hit.status).toBe('hit');
  if (hit.status !== 'hit') throw new Error('expected wall');
  expect(hit.colliderHandle).toBe(near.handle);
  expect(hit.length).toBe(4.5);
  expect(hit.distance).toBeCloseTo(1.9 - CAMERA_CONFIG.obstacleRadius - CAMERA_CONFIG.obstacleClearance, 3);
});

test('sphere detects a grazing obstacle that a centre ray misses', () => {
  setup(); wall(2, 0.23, 0.05); world.step();
  expect(world.castRay(new RAPIER.Ray(origin, { x: 0, y: 0, z: 1 }), 4.5, true)).toBeNull();
  const hit = detectCameraObstacle(world, origin, ideal);
  expect(hit.status).toBe('hit');
  if (hit.status === 'hit') expect(hit.distance).toBeLessThan(2);
});

test('empty path and obstacles beyond the ideal camera are clear; invalid segment is distinguished', () => {
  setup(); wall(5); world.step();
  expect(detectCameraObstacle(world, origin, ideal)).toEqual({ status: 'clear', length: 4.5 });
  expect(detectCameraObstacle(world, origin, origin)).toEqual({ status: 'invalid' });
  for (const x of [NaN, Infinity, -Infinity]) {
    expect(detectCameraObstacle(world, { ...origin, x }, ideal)).toEqual({ status: 'invalid' });
    expect(detectCameraObstacle(world, origin, { ...ideal, x })).toEqual({ status: 'invalid' });
  }
});

test('starting inside a wall reports zero, while a downward cast detects the floor', () => {
  setup(); const overlap = wall(0); world.step();
  const blocked = detectCameraObstacle(world, origin, ideal);
  expect(blocked.status).toBe('hit');
  if (blocked.status === 'hit') expect(blocked.distance).toBe(0);
  world.removeCollider(overlap, false);
  world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10).setTranslation(0, -0.1, 0)
    .setCollisionGroups(COLLISION_GROUPS.map));
  world.step();
  const floor = detectCameraObstacle(world, origin, { x: 0, y: -3, z: 0 });
  expect(floor.status).toBe('hit');
  if (floor.status === 'hit') expect(floor.distance).toBeCloseTo(1 - CAMERA_CONFIG.obstacleRadius - CAMERA_CONFIG.obstacleClearance, 3);
});

test('own capsule, other players, dynamic bodies, sensors and non-map groups are ignored', () => {
  setup();
  const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, 0));
  world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.35).setCollisionGroups(COLLISION_GROUPS.player), player);
  for (const desc of [RAPIER.RigidBodyDesc.dynamic(), RAPIER.RigidBodyDesc.kinematicPositionBased()]) {
    const body = world.createRigidBody(desc.setTranslation(0, 1, 1));
    world.createCollider(RAPIER.ColliderDesc.cuboid(1, 1, 0.1).setCollisionGroups(COLLISION_GROUPS.map), body);
  }
  wall(1.5).setSensor(true);
  wall(1.8).setCollisionGroups(COLLISION_GROUPS.testCube);
  const solid = wall(3); world.step();
  const hit = detectCameraObstacle(world, origin, ideal);
  expect(hit.status).toBe('hit');
  if (hit.status === 'hit') expect(hit.colliderHandle).toBe(solid.handle);
  world.removeCollider(solid, false); world.step();
  expect(detectCameraObstacle(world, origin, ideal).status).toBe('clear');
});

test('repeated probing does not change the ideal camera, target, body count or collider count', () => {
  setup(); wall(2); world.step();
  const camera = new PerspectiveCamera();
  const position = { x: -CAMERA_CONFIG.shoulderOffset, y: 1 - CAMERA_CONFIG.focusHeight, z: 0 };
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(8, 8, 8));
  const bodyPosition = body.translation(), snapshot = { ...position };
  const bodies = world.bodies.len(), colliders = world.colliders.len();
  updateFollowCamera(camera, { translation: () => position }, { yaw: 0, pitch: 0 });
  const cameraPosition = camera.position.clone(), rotation = camera.quaternion.toArray();
  for (let i = 0; i < 20; i++) {
    expect(detectCameraObstacle(world, cameraFocus(position, 0), camera.position).status).toBe('hit');
  }
  expect(camera.position).toEqual(cameraPosition);
  expect(camera.quaternion.toArray()).toEqual(rotation);
  expect(position).toEqual(snapshot);
  expect(body.translation()).toEqual(bodyPosition);
  expect(world.bodies.len()).toBe(bodies);
  expect(world.colliders.len()).toBe(colliders);
});
