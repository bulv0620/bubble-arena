import { PHYSICS_CONFIG, createMovementTuning, type MovementKeys, type MovementTuning } from '@bubble-arena/shared';

/** Fixed-step intent calculation, independent of rendering and physics engine. */
export class HorizontalMovement {
  private velocity = { x: 0, z: 0 };
  private readonly tuning: MovementTuning;
  constructor(tuning: Partial<MovementTuning> = {}) { this.tuning = createMovementTuning(tuning); }

  step(keys: MovementKeys, controlScale = 1, cameraYaw = 0) {
    const yaw = Number.isFinite(cameraYaw) ? cameraYaw : 0;
    const localX = Number(keys.right) - Number(keys.left);
    const localZ = Number(keys.backward) - Number(keys.forward);
    const x = localX * Math.cos(yaw) + localZ * Math.sin(yaw);
    const z = -localX * Math.sin(yaw) + localZ * Math.cos(yaw);
    const length = Math.hypot(x, z);
    const speed = keys.aiming === true ? this.tuning.aimSpeed : this.tuning.speed;
    const targetX = length ? x / length * speed : 0;
    const targetZ = length ? z / length * speed : 0;
    const differenceX = targetX - this.velocity.x;
    const differenceZ = targetZ - this.velocity.z;
    const difference = Math.hypot(differenceX, differenceZ);
    const scale = Number.isFinite(controlScale) ? Math.max(0, Math.min(1, controlScale)) : 0;
    const maximumChange = (length ? this.tuning.acceleration : this.tuning.deceleration)
      * PHYSICS_CONFIG.timeStep * scale;
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
