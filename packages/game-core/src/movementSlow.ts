import { BUBBLE_CONFIG, PHYSICS_CONFIG } from '@bubble-arena/shared';
/** One non-stacking slow; refresh its fixed-step duration. */
export class MovementSlow {
  private ticks = 0;
  getMultiplier = () => this.ticks > 0 ? BUBBLE_CONFIG.slowMultiplier : 1;
  apply() { this.ticks = Math.ceil(BUBBLE_CONFIG.slowDuration * PHYSICS_CONFIG.tickRate); }
  step() { if (this.ticks > 0) this.ticks--; }
  clear() { this.ticks = 0; }
}
