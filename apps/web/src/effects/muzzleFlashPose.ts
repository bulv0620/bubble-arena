import type { WeaponId } from '@bubble-arena/shared';
import type { Object3D } from 'three';

/** Follow the rendered muzzle socket; a fired bullet's origin stays immutable. */
export function updateMuzzleFlashPose(flash: Object3D, anchor: Object3D | null, weapon: WeaponId, active: boolean) {
  flash.visible = false;
  if (!active || !anchor || anchor.userData.weapon !== weapon) return;
  for (let parent: Object3D | null = anchor; parent; parent = parent.parent) if (!parent.visible) return;
  anchor.getWorldPosition(flash.position);
  anchor.getWorldQuaternion(flash.quaternion);
  flash.visible = true;
}
