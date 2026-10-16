import { expect, test } from 'vitest';
import { Group, Vector3 } from 'three';
import { updateMuzzleFlashPose } from './muzzleFlashPose';
import { RIFLE_PLACEHOLDER_POSE as pose, WEAPON_PLACEHOLDER_SCALE } from '../weapons/riflePose';
import { rifleMuzzlePosition } from '../weapons/riflePose';

test.each(['rifle','sniper','shotgun','bubble'] as const)('%s flash follows the actual muzzle through movement and turning, while matching the logical muzzle', weapon => {
  const actor = new Group(), socket = new Group(), scale = new Group(), anchor = new Group(), flash = new Group();
  actor.add(socket); socket.position.copy(pose.socket); socket.rotation.y = Math.PI;
  socket.add(scale); scale.scale.z = WEAPON_PLACEHOLDER_SCALE[weapon];
  scale.add(anchor); anchor.position.set(0,pose.front.y,pose.front.z+pose.front.depth/2); anchor.userData.weapon = weapon;
  for (const yaw of [0,.7,Math.PI,-1.2]) {
    actor.position.set(yaw * 2, 1 + yaw, -4); actor.rotation.y = yaw;
    updateMuzzleFlashPose(flash,anchor,weapon,true);
    expect(flash.visible).toBe(true);
    const actual = anchor.getWorldPosition(new Vector3());
    expect(flash.position.distanceTo(actual)).toBeLessThan(1e-10);
    expect(flash.position.distanceTo(new Vector3().copy(rifleMuzzlePosition(actor.position,yaw,weapon)!))).toBeLessThan(1e-10);
    expect(flash.quaternion.angleTo(anchor.getWorldQuaternion(flash.quaternion.clone()))).toBeLessThan(1e-7);
  }
});

test('switching weapon, hidden actor, missing anchor and expired effect hide the flash without leaving a world dot', () => {
  const actor = new Group(), anchor = new Group(), flash = new Group(); actor.add(anchor); anchor.userData.weapon = 'rifle';
  updateMuzzleFlashPose(flash,anchor,'rifle',true); expect(flash.visible).toBe(true);
  for (const [node,weapon,active] of [[anchor,'sniper',true],[null,'rifle',true],[anchor,'rifle',false]] as const) {
    updateMuzzleFlashPose(flash,node,weapon,active); expect(flash.visible).toBe(false);
  }
  actor.visible = false; updateMuzzleFlashPose(flash,anchor,'rifle',true); expect(flash.visible).toBe(false);
  actor.visible = true; actor.position.x = 3; updateMuzzleFlashPose(flash,anchor,'rifle',true);
  expect(flash.visible).toBe(true); expect(flash.position.x).toBe(3);
});
