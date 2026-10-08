import { PHYSICS_CONFIG, PLAYER_CONFIG, type MovementKeys } from '@bubble-arena/shared';

/** Fixed-step intent calculation, independent of rendering and physics engine. */
export class HorizontalMovement {
  private velocity = { x: 0, z: 0 };

  step(keys: MovementKeys, controlScale = 1, cameraYaw = 0) {
    const yaw = Number.isFinite(cameraYaw) ? cameraYaw : 0;
    const localX = Number(keys.right) - Number(keys.left);
    const localZ = Number(keys.backward) - Number(keys.forward);
    const x = localX * Math.cos(yaw) + localZ * Math.sin(yaw);
    const z = -localX * Math.sin(yaw) + localZ * Math.cos(yaw);
    const length = Math.hypot(x, z);
    const targetX = length ? x / length * PLAYER_CONFIG.speed : 0;
    const targetZ = length ? z / length * PLAYER_CONFIG.speed : 0;
    const differenceX = targetX - this.velocity.x;
    const differenceZ = targetZ - this.velocity.z;
    const difference = Math.hypot(differenceX, differenceZ);
    const maximumChange = (length ? PLAYER_CONFIG.acceleration : PLAYER_CONFIG.deceleration)
      * PHYSICS_CONFIG.timeStep * controlScale;
    const fraction = difference ? Math.min(1, maximumChange / difference) : 0;
    this.velocity.x += differenceX * fraction;
    this.velocity.z += differenceZ * fraction;
    return {
      x: this.velocity.x * PHYSICS_CONFIG.timeStep,
      y: 0,
      z: this.velocity.z * PHYSICS_CONFIG.timeStep,
    };
  }
}
