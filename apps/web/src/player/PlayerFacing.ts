import { createMovementTuning, type MovementTuning } from '@bubble-arena/shared';

/** Visual heading, where the model's forward axis is local -Z. Never rotates a collider. */
export class PlayerFacing {
  private yaw = 0;
  private readonly tuning: MovementTuning;
  constructor(tuning: Partial<Pick<MovementTuning, 'turnResponse' | 'turnMinSpeed'>> = {}) {
    this.tuning = createMovementTuning(tuning);
  }
  getYaw() { return this.yaw; }
  reset() { this.yaw = 0; }

  step(dx: number, dz: number, dt: number, aimYaw?: number) {
    if (!Number.isFinite(dt) || dt <= 0) return this.yaw;
    if (aimYaw === undefined && (![dx, dz].every(Number.isFinite)
      || Math.hypot(dx, dz) / dt < this.tuning.turnMinSpeed)) return this.yaw;
    if (aimYaw !== undefined && !Number.isFinite(aimYaw)) return this.yaw;
    const target = aimYaw ?? Math.atan2(-dx, -dz);
    const difference = Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw));
    const next = this.yaw + difference * (1 - Math.exp(-this.tuning.turnResponse * dt));
    this.yaw = Math.atan2(Math.sin(next), Math.cos(next));
    return this.yaw;
  }
}
