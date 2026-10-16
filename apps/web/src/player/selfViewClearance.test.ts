import { expect, test } from 'vitest';
import { CapsuleGeometry, Group, Mesh, PerspectiveCamera, SphereGeometry, Vector3 } from 'three';
import { BLOCK_AVATAR_CONFIG as shape, CAMERA_CONFIG, TRAINING_RANGE_CONFIG, TRAINING_TARGET_LAYOUT } from '@bubble-arena/shared';
import { updateFollowCamera } from '../camera/cameraFollowPose';
import { createScreenAimRay } from '../weapons/screenAimRay';
import { rifleMuzzlePosition } from '../weapons/riflePose';
import { OVERHEAD_HEALTH_CONFIG as health } from '../HUD/overheadHealthConfig';
import { createSelfPlateClearance, createSelfViewClearance } from './selfViewClearance';

function fixture(weapon: 'rifle' | 'shotgun' | 'sniper' | 'bubble') {
  const root = new Group(), anchor = new Group(); anchor.position.set(...health.selfPosition); root.add(anchor);
  const head = new Mesh(new SphereGeometry(shape.headRadius, 16, 12)); head.position.y = shape.headY; root.add(head);
  const body = new Mesh(new CapsuleGeometry(shape.bodyRadius, shape.bodyHalfHeight * 2, 8, 16)); body.position.y = shape.bodyY; root.add(body);
  // A conservative muzzle-tip sphere complements the shared actual head/body silhouette.
  const muzzle = new Mesh(new SphereGeometry(.08, 8, 6)), point = rifleMuzzlePosition({ x: 0, y: 0, z: 0 }, 0, weapon)!;
  muzzle.position.copy(point); const socket = new Group(); socket.name = 'weapon_socket'; socket.add(muzzle); root.add(socket);
  return { root, plate: { anchor, width: health.selfWidth, height: health.selfHeightBound, distanceFactor: health.selfDistanceFactor },
    dispose: () => { head.geometry.dispose(); body.geometry.dispose(); muzzle.geometry.dispose(); } };
}
test.each(['rifle', 'shotgun', 'sniper', 'bubble'] as const)('%s keeps the aiming center clear across viewport/yaw/jump positions without hiding the closer-centered avatar', weapon => {
  const f = fixture(weapon), check = createSelfViewClearance();
  try {
    for (const [width, height] of [[1280, 720], [960, 720], [800, 600]]) {
      const camera = new PerspectiveCamera(CAMERA_CONFIG.fov, width / height, CAMERA_CONFIG.near, CAMERA_CONFIG.far);
      for (const yaw of [0, Math.PI / 2, -Math.PI, .7]) for (const pitch of [CAMERA_CONFIG.initialPitch]) {
        for (const position of [{ x: TRAINING_RANGE_CONFIG.playerSpawnXZ[0], y: .91, z: 0 }, { x: -3, y: 2.4, z: -7 }]) {
          f.root.position.copy(position); f.root.rotation.y = yaw;
          updateFollowCamera(camera, { translation: () => position }, { yaw, pitch });
          expect(check(f.root, camera, width, height, health.aimCenterClearance), JSON.stringify({ weapon, width, height, yaw, pitch, position })).toBe(false);
        }
      }
    }
  } finally { f.dispose(); }
});
test('a compressed camera crossing the player triggers protection and a hidden group can recover after moving the camera clear', () => {
  const f = fixture('sniper'), check = createSelfViewClearance(), camera = new PerspectiveCamera(70, 16 / 9, .1, 200);
  try {
    camera.position.set(0, shape.headY, 1); camera.lookAt(0, shape.headY, 0);
    expect(check(f.root, camera, 1280, 720, 76, f.plate)).toBe(true);
    f.root.visible = false;
    updateFollowCamera(camera, { translation: () => ({ x: 0, y: 0, z: 0 }) });
    expect(check(f.root, camera, 1280, 720, health.aimCenterClearance)).toBe(false);
    expect(check(f.root, camera, 0, 0, 76, f.plate)).toBe(true);
  } finally { f.dispose(); }
});
test('a central overhead plate is protected even when the own mesh is off-center; default center ray still faces the middle range lane', () => {
  const f = fixture('rifle'), check = createSelfViewClearance(), camera = new PerspectiveCamera(70, 16 / 9, .1, 200);
  try {
    f.root.position.x = -5; camera.position.set(0, 0, 4.5); camera.lookAt(0, 0, 0);
    const centralAnchor = new Group();
    expect(check(f.root, camera, 1280, 720, 30, { ...f.plate, anchor: centralAnchor })).toBe(true);
    const position = { x: TRAINING_RANGE_CONFIG.playerSpawnXZ[0], y: .91, z: 0 };
    updateFollowCamera(camera, { translation: () => position }); camera.updateMatrixWorld();
    const ray = createScreenAimRay(camera)!;
    expect(ray.origin.x).toBeCloseTo(TRAINING_TARGET_LAYOUT[1].position[0]);
    expect(ray.direction.x).toBeCloseTo(0);
    expect(new Vector3().copy(ray.direction).distanceTo(camera.getWorldDirection(new Vector3()))).toBeLessThan(1e-10);
  } finally { f.dispose(); }
});

test('an outer spread overlap can retain the avatar while central geometry still triggers protection', () => {
  const root = new Group(), socket = new Group(); socket.name = 'weapon_socket'; root.add(socket);
  const gun = new Mesh(new SphereGeometry(.05,8,6)); socket.add(gun);
  const camera = new PerspectiveCamera(70,16/9,.1,200); camera.position.set(0,0,4.5); camera.lookAt(0,0,0);
  const check = createSelfViewClearance();
  try {
    gun.position.x = .4; expect(check(root,camera,1280,720,health.aimCenterClearance)).toBe(false);
    gun.position.x = 0; expect(check(root,camera,1280,720,health.aimCenterClearance)).toBe(true);
    gun.position.x = .4; socket.name = 'block-avatar'; expect(check(root,camera,1280,720,health.aimCenterClearance)).toBe(false);
    expect(check(root,camera,1280,720,76)).toBe(true);
  } finally { gun.geometry.dispose(); }
});

test('expanding the reticle hides only the own plate, which returns when the reticle recovers', () => {
  const f = fixture('rifle'), check = createSelfViewClearance(), plate = createSelfPlateClearance();
  try {
    for (const [width,height] of [[1280,720],[800,600]]) {
      const camera = new PerspectiveCamera(CAMERA_CONFIG.fov,width/height,.1,200);
      updateFollowCamera(camera,{translation:()=>({x:0,y:0,z:0})});
      expect(check(f.root,camera,width,height,health.aimCenterClearance)).toBe(false);
      expect(plate(camera,width,height,26,f.plate)).toBe(false);
      expect(plate(camera,width,height,76,f.plate)).toBe(true);
      expect(check(f.root,camera,width,height,health.aimCenterClearance)).toBe(false);
      expect(plate(camera,width,height,26,f.plate)).toBe(false);
    }
  } finally { f.dispose(); }
});
