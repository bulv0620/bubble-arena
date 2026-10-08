import { HorizontalMovement, VerticalMovement } from '@bubble-arena/game-core';
import { COLLISION_GROUPS, PLAYER_CONFIG, type MovementKeys } from '@bubble-arena/shared';
import { QueryFilterFlags, type Collider, type RigidBody, type World } from '@dimforge/rapier3d-compat';

/** Owns a controller in an existing world. Only static map obstacles participate. */
export class RapierMovement {
  private readonly intent = new HorizontalMovement();
  private readonly vertical = new VerticalMovement();
  private readonly controller;
  private disposed = false;

  constructor(private readonly world: World) {
    this.controller = world.createCharacterController(PLAYER_CONFIG.controllerOffset);
    this.controller.setSlideEnabled(true);
    this.controller.setApplyImpulsesToDynamicBodies(false);
    this.controller.disableAutostep();
    this.controller.disableSnapToGround();
  }

  step(body: RigidBody, collider: Collider, keys: MovementKeys, jumpPressed = false) {
    if (this.disposed) return;
    // Recheck the current capsule pose before accepting input. Last tick's support
    // may have disappeared, and a rising capsule must never regain jump eligibility.
    this.controller.computeColliderMovement(
      collider, { x: 0, y: -PLAYER_CONFIG.groundProbeDistance, z: 0 },
      QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS,
      COLLISION_GROUPS.player,
    );
    this.vertical.refreshSupport(this.controller.computedGrounded());
    const horizontal = this.intent.step(keys, this.vertical.getState().grounded ? 1 : PLAYER_CONFIG.airControl);
    const vertical = this.vertical.step(jumpPressed);
    const desired = { ...horizontal, y: vertical.y };
    this.controller.computeColliderMovement(
      collider, desired,
      QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS,
      COLLISION_GROUPS.player,
    );
    const allowed = this.controller.computedMovement();
    const current = body.translation();
    this.vertical.resolve(desired.y, allowed.y, this.controller.computedGrounded());
    body.setNextKinematicTranslation({ x: current.x + allowed.x, y: current.y + allowed.y, z: current.z + allowed.z });
    return { desired, allowed, jumped: vertical.jumped, ...this.vertical.getState() };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.world.removeCharacterController(this.controller);
  }
}
