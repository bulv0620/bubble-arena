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
    this.controller.setMaxSlopeClimbAngle(PLAYER_CONFIG.maxSlopeAngle + PLAYER_CONFIG.slopeAngleTolerance);
    this.controller.setMinSlopeSlideAngle(PLAYER_CONFIG.maxSlopeAngle + PLAYER_CONFIG.slopeAngleTolerance);
    this.controller.enableAutostep(PLAYER_CONFIG.maxStepHeight, PLAYER_CONFIG.minStepWidth, false);
    this.controller.disableSnapToGround();
  }

  step(body: RigidBody, collider: Collider, keys: MovementKeys, jumpPressed = false) {
    if (this.disposed) return;
    // Recheck the current capsule pose before accepting input. Last tick's support
    // may have disappeared, and a rising capsule must never regain jump eligibility.
    this.controller.disableSnapToGround();
    this.controller.computeColliderMovement(
      collider, { x: 0, y: -PLAYER_CONFIG.groundProbeDistance / Math.cos(PLAYER_CONFIG.maxSlopeAngle), z: 0 },
      QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS,
      COLLISION_GROUPS.player,
    );
    this.vertical.refreshSupport(this.controller.computedGrounded());
    let onSlope = false;
    for (let i = 0; i < this.controller.numComputedCollisions(); i += 1) {
      const normal = this.controller.computedCollision(i)?.normal1;
      // Ground eligibility comes from Rapier's configured slope limit. This loose
      // normal check only selects snapping, tolerating noisy capsule face contacts.
      if (normal && normal.y > PLAYER_CONFIG.slopeSnapMinNormalY
        && normal.y < PLAYER_CONFIG.slopeSnapMaxNormalY) onSlope = true;
    }
    const horizontal = this.intent.step(keys, this.vertical.getState().grounded ? 1 : PLAYER_CONFIG.airControl);
    const vertical = this.vertical.step(jumpPressed);
    // Follow descending slopes while supported, preserving ordinary flat/wall motion.
    if (onSlope && this.vertical.getState().grounded && vertical.y <= 0) {
      this.controller.enableSnapToGround(PLAYER_CONFIG.groundSnapDistance);
    }
    const desired = { ...horizontal, y: vertical.y };
    this.controller.computeColliderMovement(
      collider, desired,
      QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_KINEMATIC | QueryFilterFlags.EXCLUDE_SENSORS,
      COLLISION_GROUPS.player,
    );
    const allowed = this.controller.computedMovement();
    const current = body.translation();
    let ceilingContact = false;
    for (let i = 0; i < this.controller.numComputedCollisions(); i += 1) {
      const normal = this.controller.computedCollision(i)?.normal1;
      if (normal && normal.y < PLAYER_CONFIG.ceilingMaxNormalY) ceilingContact = true;
    }
    this.vertical.resolve(desired.y, allowed.y, this.controller.computedGrounded(), ceilingContact);
    body.setNextKinematicTranslation({ x: current.x + allowed.x, y: current.y + allowed.y, z: current.z + allowed.z });
    return { desired, allowed, jumped: vertical.jumped, ...this.vertical.getState() };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.world.removeCharacterController(this.controller);
  }
}
