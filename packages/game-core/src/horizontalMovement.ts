import { PHYSICS_CONFIG, createMovementTuning, type MovementKeys, type MovementTuning } from '@bubble-arena/shared';

/** Fixed-step intent calculation, independent of rendering and physics engine. */
export class HorizontalMovement {
  private velocity = { x: 0, z: 0 };
  private readonly tuning: MovementTuning;
  constructor(tuning: Partial<MovementTuning> = {}) { this.tuning = createMovementTuning(tuning); }

  step(keys: MovementKeys, controlScale = 1, cameraYaw = 0, speedScale = 1, maximumSpeed?: number) {
    if (maximumSpeed !== undefined && (!Number.isFinite(maximumSpeed) || maximumSpeed < 0)) throw new RangeError('Invalid movement speed cap');
    const yaw = Number.isFinite(cameraYaw) ? cameraYaw : 0;
    const localX = Number(keys.right) - Number(keys.left);
    const localZ = Number(keys.backward) - Number(keys.forward);
    const x = localX * Math.cos(yaw) + localZ * Math.sin(yaw);
    const z = -localX * Math.sin(yaw) + localZ * Math.cos(yaw);
    const length = Math.hypot(x, z);
    const speed = (keys.aiming === true ? this.tuning.aimSpeed : this.tuning.speed)
      * (Number.isFinite(speedScale) ? Math.max(0, Math.min(2, speedScale)) : 0);
    const targetSpeed = maximumSpeed === undefined ? speed : Math.min(speed, maximumSpeed);
    const targetX = length ? x / length * targetSpeed : 0;
    const targetZ = length ? z / length * targetSpeed : 0;
    const differenceX = targetX - this.velocity.x;
    const differenceZ = targetZ - this.velocity.z;
    const difference = Math.hypot(differenceX, differenceZ);
    const scale = Number.isFinite(controlScale) ? Math.max(0, Math.min(1, controlScale)) : 0;
    const maximumChange = (length ? this.tuning.acceleration : this.tuning.deceleration)
      * PHYSICS_CONFIG.timeStep * scale;
    const fraction = difference ? Math.min(1, maximumChange / difference) : 0;
    this.velocity.x += differenceX * fraction;
    this.velocity.z += differenceZ * fraction;
    if (maximumSpeed !== undefined) {
      const magnitude = Math.hypot(this.velocity.x, this.velocity.z);
      if (magnitude > maximumSpeed) { this.velocity.x *= maximumSpeed / magnitude; this.velocity.z *= maximumSpeed / magnitude; }
    }
    return {
      x: this.velocity.x * PHYSICS_CONFIG.timeStep,
      y: 0,
      z: this.velocity.z * PHYSICS_CONFIG.timeStep,
    };
  }
}
