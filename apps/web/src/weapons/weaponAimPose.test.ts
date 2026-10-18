import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_CONFIG, COLLISION_GROUPS, WEAPON_IDS } from '@bubble-arena/shared';
import { updateFollowCamera } from '../camera/cameraFollowPose';
import { createScreenAimRay, type ScreenAimTarget } from './screenAimRay';
import { rifleMuzzlePosition, RIFLE_PLACEHOLDER_POSE as config, WEAPON_PLACEHOLDER_SCALE } from './riflePose';
import { muzzleAimDirection, queryMuzzleRay } from './muzzleRay';
import { updateMuzzleFlashPose } from '../effects/muzzleFlashPose';
beforeAll(async () => { await RAPIER.init(); });

test.each(WEAPON_IDS)('%s holds a static body-forward bore while the physical shot converges on the camera-selected point', weapon => {
  const actor = new Group(), socket = new Group(), scale = new Group(), tip = new Group(), flash = new Group();
  actor.add(socket); socket.position.copy(config.socket); socket.rotation.y = Math.PI;
  socket.add(scale); scale.scale.z = WEAPON_PLACEHOLDER_SCALE[weapon];
  scale.add(tip); tip.position.set(0, config.front.y, config.front.z + config.front.depth / 2); tip.userData.weapon = weapon;
  for (const center of [{ x: 0, y: .71, z: 0 }, { x: 4, y: 2.7, z: -5 }]) for (const yaw of [0, .8, -2.1]) {
    actor.position.copy(center); actor.rotation.y = yaw;
    const muzzle = rifleMuzzlePosition(center, yaw, weapon)!, rendered = tip.getWorldPosition(new Vector3()), bore = tip.getWorldDirection(new Vector3());
    expect(rendered.distanceTo(muzzle)).toBeLessThan(1e-10);
    expect(bore.distanceTo(new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)))).toBeLessThan(1e-10);
    for (const pitch of [-.6, 0, CAMERA_CONFIG.initialPitch, .8]) for (const distance of [.1, 5, 20, 70]) {
      const camera = new PerspectiveCamera(CAMERA_CONFIG.fov, 16 / 9, .1, 200);
      updateFollowCamera(camera, { translation: () => center }, { yaw, pitch }); camera.updateMatrixWorld();
      const ray = createScreenAimRay(camera)!;
      const point = new Vector3().copy(ray.origin).addScaledVector(new Vector3().copy(ray.direction), distance);
      const target: ScreenAimTarget = { ...ray, point, distance, status: 'hit', colliderHandle: null };
      const direction = new Vector3().copy(muzzleAimDirection(muzzle, target)!);
      const delta=point.clone().sub(muzzle);
      if(delta.dot(new Vector3().copy(ray.direction))>.05){expect(direction.clone().cross(delta).length()).toBeLessThan(1e-10);expect(direction.dot(delta)).toBeGreaterThan(0);}
      else expect(direction.distanceTo(ray.direction)).toBeLessThan(1e-10);
      // Near cover or camera pitch cannot move the muzzle or pitch/yaw the held gun.
      expect(tip.getWorldPosition(new Vector3()).distanceTo(rendered)).toBeLessThan(1e-10);
      expect(tip.getWorldDirection(new Vector3()).distanceTo(bore)).toBeLessThan(1e-10);
      updateMuzzleFlashPose(flash, tip, weapon, true);
      expect(flash.position.distanceTo(rendered)).toBeLessThan(1e-10);
      expect(flash.getWorldDirection(new Vector3()).distanceTo(bore)).toBeLessThan(1e-10);
    }
  }
});
test.each(WEAPON_IDS)('%s static muzzle honours the anchor-to-tip cover guard regardless of the ballistic aim', weapon => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const center = { x: 0, y: 1, z: 0 }, point = { x: .8, y: 3, z: -10 }, muzzle = rifleMuzzlePosition(center, 0, weapon)!;
    const middle = new Vector3().copy(center).lerp(muzzle, .5);
    const blocker = world.createCollider(RAPIER.ColliderDesc.ball(.08).setTranslation(middle.x, middle.y, middle.z).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    const target: ScreenAimTarget = { status: 'clear', origin: center, direction: { x: 0, y: 0, z: -1 }, point, distance: 70, range: 70, colliderHandle: null };
    expect(queryMuzzleRay(world, center, muzzle, target, 70)?.status).toBe('blocked-muzzle');
    world.removeCollider(blocker, true); world.step();
    const ray = queryMuzzleRay(world, center, muzzle, target, 70)!;
    expect(ray.status).toBe('clear');
    expect(ray.origin).toEqual(muzzle);
    expect(new Vector3().copy(ray.direction).distanceTo(new Vector3().copy(point).sub(muzzle).normalize())).toBeLessThan(1e-10);
  } finally { world.free(); }
});
test('invalid aim rejects without mutation; near/behind points never turn the bore or create backward directions', () => {
  const center = Object.freeze({ x: 0, y: 1, z: 0 }), muzzle = rifleMuzzlePosition(center, 0, 'sniper')!;
  const fallback = Object.freeze({ x: 0, y: .3, z: -1 });
  const target: ScreenAimTarget = { origin: center, point: center, direction: fallback, distance: 1, range: 70, status: 'hit', colliderHandle: null };
  for (const point of [center, { ...center, z: 2 }, { ...muzzle, x: muzzle.x + .01 }]) {
    const direction = muzzleAimDirection(muzzle, { ...target, point })!;
    expect(direction.z).toBeLessThan(0); expect(direction.y).toBeGreaterThan(0);
    expect(Object.isFrozen(direction)).toBe(true);
    expect(rifleMuzzlePosition(center, 0, 'sniper')).toEqual(muzzle);
  }
  expect(rifleMuzzlePosition(center, NaN)).toBeNull();
  expect(rifleMuzzlePosition({ ...center, x: NaN }, 0)).toBeNull();
  expect(muzzleAimDirection(muzzle, { ...target, point: { x: NaN, y: 0, z: 0 } })).toBeNull();
  expect(muzzleAimDirection(muzzle, { ...target, direction: { x: 0, y: 0, z: 0 } })).toBeNull();
  expect(muzzleAimDirection(muzzle,{...target,point:muzzle})).toBeNull();
  expect(muzzleAimDirection(muzzle, { ...target, origin: {x:NaN,y:0,z:0} })).toBeNull();
  expect(muzzleAimDirection(muzzle, { ...target, range: 0 })).toBeNull();
  expect(center).toEqual({ x: 0, y: 1, z: 0 });
});
