import { Ball, QueryFilterFlags, type World } from '@dimforge/rapier3d-compat';
import { BubbleFlight } from '@bubble-arena/game-core';
import { BUBBLE_CONFIG, COLLISION_GROUPS, PHYSICS_CONFIG } from '@bubble-arena/shared';
import type { AimVector } from './screenAimRay';
import type { TrainingTargets } from './TrainingTargets';

/** Queries the same static map/registered sensors; creates no rigid bodies or colliders. */
export class LocalBubbleFlight {
  readonly flight = new BubbleFlight();
  private readonly shape = new Ball(BUBBLE_CONFIG.radius);
  private explosion: { point: AimVector; ticks: number } | null = null;
  constructor(private readonly targets: TrainingTargets, private readonly canCauseControl = () => true) {}
  getExplosion = () => this.explosion;
  step(world: World, tick: number) {
    if (this.explosion) this.explosion = this.explosion.ticks > 1 ? { ...this.explosion, ticks: this.explosion.ticks - 1 } : null;
    this.flight.step((origin, direction, distance) => {
      const hit = world.castShape(origin, { x: 0, y: 0, z: 0, w: 1 }, direction, this.shape, 0, distance, true,
        QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC, COLLISION_GROUPS.projectileQuery,
        undefined, undefined, collider => !collider.isSensor() || this.targets.isRegistered(collider.handle));
      return hit?.time_of_impact ?? null;
    }, (sequence, point) => {
      this.targets.receiveExplosion(world, { sequence, tick }, point, this.canCauseControl());
      this.explosion = { point, ticks: Math.ceil(.3 * PHYSICS_CONFIG.tickRate) };
    });
  }
  clear() { this.flight.clear(); this.explosion = null; }
}
