import { ARENA_BOT_CONFIG as config, ARENA_BOT_ROUTE, type PlayerLifeStatus } from '@bubble-arena/shared';
export interface BotIntent { readonly x: number; readonly z: number; readonly fire: boolean; readonly yaw: number }
/** Tiny deterministic local opponent: patrol, react to LOS, controlled bursts, no omniscient damage. */
export class ArenaBotBrain {
  private waypoint = 1;
  private acquiredAt: number | null = null;
  private clock = -1;
  private intent: BotIntent = Object.freeze({ x: 0, z: 0, fire: false, yaw: Math.PI });
  reset() { this.waypoint = 1; this.acquiredAt = null; this.clock = -1; }
  step(tick: number, self: { x: number; z: number }, target: { x: number; z: number }, status: PlayerLifeStatus, targetStatus: PlayerLifeStatus, visible: boolean, playing: boolean): BotIntent {
    if (!Number.isSafeInteger(tick) || tick < 0 || ![self.x, self.z, target.x, target.z].every(Number.isFinite) || typeof visible !== 'boolean' || typeof playing !== 'boolean'
      || !['normal', 'downed', 'eliminated', 'respawning'].includes(status) || !['normal', 'downed', 'eliminated', 'respawning'].includes(targetStatus)) throw new TypeError('Invalid bot frame');
    if (tick <= this.clock) return this.intent; this.clock = tick;
    if (!playing || status !== 'normal') { this.acquiredAt = null; return this.intent = Object.freeze({ x: 0, z: 0, fire: false, yaw: this.intent.yaw }); }
    const dx = target.x - self.x, dz = target.z - self.z, distance = Math.hypot(dx, dz);
    if (visible && distance <= config.viewRange && (targetStatus === 'normal' || targetStatus === 'downed')) {
      this.acquiredAt ??= tick;
      const elapsed = tick - this.acquiredAt - config.reactionTicks;
      const fire = elapsed >= 0 && elapsed % (config.burstTicks + config.restTicks) < config.burstTicks;
      const move = distance > config.stopDistance ? 1 : 0;
      return this.intent = Object.freeze({ x: distance ? dx / distance * move : 0, z: distance ? dz / distance * move : 0, yaw: Math.atan2(-dx, -dz), fire });
    }
    this.acquiredAt = null;
    let waypoint = ARENA_BOT_ROUTE[this.waypoint];
    if (Math.hypot(waypoint.x - self.x, waypoint.z - self.z) < config.waypointRadius) { this.waypoint = (this.waypoint + 1) % ARENA_BOT_ROUTE.length; waypoint = ARENA_BOT_ROUTE[this.waypoint]; }
    const x = waypoint.x - self.x, z = waypoint.z - self.z, length = Math.hypot(x, z);
    return this.intent = Object.freeze({ x: length ? x / length : 0, z: length ? z / length : 0, fire: false, yaw: Math.atan2(-x, -z) });
  }
}
