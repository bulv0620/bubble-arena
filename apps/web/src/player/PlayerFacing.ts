import { PLAYER_CONFIG } from '@bubble-arena/shared';

/** Visual heading, where the model's forward axis is local -Z. Never rotates a collider. */
export class PlayerFacing {
  private yaw = 0;
  getYaw() { return this.yaw; }
  reset() { this.yaw = 0; }

  step(dx: number, dz: number, dt: number) {
    if (![dx, dz, dt].every(Number.isFinite) || dt <= 0
      || Math.hypot(dx, dz) / dt < PLAYER_CONFIG.turnMinSpeed) return this.yaw;
    const target = Math.atan2(-dx, -dz);
    const difference = Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw));
    const next = this.yaw + difference * (1 - Math.exp(-PLAYER_CONFIG.turnResponse * dt));
    this.yaw = Math.atan2(Math.sin(next), Math.cos(next));
    return this.yaw;
  }
}
