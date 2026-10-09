/** Model forward is local -Z. Camera already smooths yaw; never rotate a collider. */
export class PlayerFacing {
  private yaw = 0;
  getYaw() { return this.yaw; }
  reset() { this.yaw = 0; }
  step(viewYaw: number) {
    if (Number.isFinite(viewYaw)) this.yaw = Math.atan2(Math.sin(viewYaw), Math.cos(viewYaw));
    return this.yaw;
  }
}
