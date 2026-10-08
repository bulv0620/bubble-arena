import { HorizontalMovement } from '@bubble-arena/game-core';
import { COLLISION_GROUPS, PLAYER_CONFIG, type MovementKeys } from '@bubble-arena/shared';
import { QueryFilterFlags, type Collider, type RigidBody, type World } from '@dimforge/rapier3d-compat';

/** Owns a controller in an existing world. Only static map obstacles participate. */
export class RapierMovement {
  private readonly intent = new HorizontalMovement();
  private readonly controller;
  private disposed = false;

  constructor(private readonly world: World) {
    this.controller = world.createCharacterController(PLAYER_CONFIG.controllerOffset);
    this.controller.setSlideEnabled(true);
    this.controller.setApplyImpulsesToDynamicBodies(false);
    this.controller.disableAutostep();
    this.controller.disableSnapToGround();
  }

  step(body: RigidBody, collider: Collider, keys: MovementKeys) {
    if (this.disposed) return;
    const desired = this.intent.step(keys);
    this.controller.computeColliderMovement(
      collider, desired,
      QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS,
      COLLISION_GROUPS.player,
    );
    const allowed = this.controller.computedMovement();
    const current = body.translation();
    body.setNextKinematicTranslation({ x: current.x + allowed.x, y: current.y, z: current.z + allowed.z });
    return { desired, allowed: { x: allowed.x, y: 0, z: allowed.z } };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.world.removeCharacterController(this.controller);
  }
}
