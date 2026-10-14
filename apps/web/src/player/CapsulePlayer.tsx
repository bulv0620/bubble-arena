import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { PerspectiveCamera, Vector3, type Group } from 'three';
import { playerActionPolicy } from '@bubble-arena/game-core';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { COLLIDER_MATERIALS, COLLISION_GROUPS, PHYSICS_CONFIG, PLAYER_CONFIG, type CameraHeading } from '@bubble-arena/shared';
import type { KeyboardInput } from './KeyboardInput';
import { RapierMovement } from './RapierMovement';
import { PlayerFacing } from './PlayerFacing';
import { BlockAvatar } from '../visuals';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import { PlayerOverheadHealth } from '../HUD/OverheadHealth';
import { RiflePlaceholder, type RifleMotion } from '../weapons';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import { createSelfViewClearance } from './selfViewClearance';
import { OVERHEAD_HEALTH_CONFIG } from '../HUD/overheadHealthConfig';
import { crosshairSize } from '../HUD/crosshairSize';
import { reticleProgress } from '../HUD/reticleProgress';

interface CapsulePlayerProps {
  playerHealth: LocalPlayerHealth;
  loadout: LocalLoadout;
  /** World-space capsule center, not the foot position. */
  position: [number, number, number];
  input: KeyboardInput;
  bodyRef: RefObject<RapierRigidBody | null>;
  view: RefObject<CameraHeading>;
  motion: RifleMotion;
  facingYaw: RefObject<number>;
}

export function CapsulePlayer({ position, input, bodyRef: body, view, motion, facingYaw, playerHealth, loadout }: CapsulePlayerProps) {
  const lifeStatus = useSyncExternalStore(playerHealth.subscribe, () => playerHealth.getSnapshot().status);
  const scoped = useSyncExternalStore(loadout.subscribe, () => loadout.getSnapshot().scoped);
  const { radius, capsuleHalfHeight } = PLAYER_CONFIG;
  const movement = useRef<RapierMovement | null>(null);
  const visual = useRef<Group | null>(null);
  const healthAnchor = useRef<Group | null>(null);
  const [obscured, setObscured] = useState(false);
  const lastObscured = useRef(false);
  const [checkClearance] = useState(createSelfViewClearance);
  const [facing] = useState(() => new PlayerFacing());
  const diagnostics = useRef({ ticks: 0, wasActive: false, result: undefined as ReturnType<RapierMovement['step']> });
  const { world } = useRapier();
  useEffect(() => {
    const adapter = new RapierMovement(world);
    facing.reset();
    facingYaw.current = 0;
    movement.current = adapter;
    return () => {
      motion.reset();
      movement.current = null;
      adapter.dispose();
    };
  }, [world, facing, facingYaw, motion]);
  useBeforePhysicsStep(() => {
    const policy = playerActionPolicy(playerHealth.getSnapshot().status), jump = input.consumeJump();
    const rigidBody = body.current;
    if (rigidBody && rigidBody.numColliders() > 0) {
      const result = movement.current?.step(rigidBody, rigidBody.collider(0),
        policy.canMove ? { ...input.getSnapshot(), aiming: false } : { forward: false, backward: false, left: false, right: false },
        policy.canJump && jump, view.current.yaw, loadout.getSpeed() / PLAYER_CONFIG.speed, policy.maximumSpeed ?? undefined);
      const speed = result ? Math.hypot(result.allowed.x, result.allowed.z) / PHYSICS_CONFIG.timeStep : 0;
      motion.setSpeed(speed, Boolean(result && (result.jumped || !result.grounded)));
      facing.step(view.current.yaw);
      facingYaw.current = facing.getYaw();
      if (import.meta.env.DEV) diagnostics.current.result = result;
    } else motion.reset();
  });
  const [forward] = useState(() => new Vector3());
  useFrame(({ camera, size }) => {
    camera.getWorldDirection(forward);
    facing.step(Math.atan2(-forward.x, -forward.z));
    facingYaw.current = facing.getYaw();
    if (visual.current) {
      visual.current.rotation.y = facing.getYaw();
      const reticle = crosshairSize(loadout.getAngle());
      const radius = (reticleProgress(loadout.getSnapshot()) ? Math.max(88, reticle + 24) : reticle) / 2 + OVERHEAD_HEALTH_CONFIG.reticleClearance;
      const blocked = !scoped && camera instanceof PerspectiveCamera && checkClearance(visual.current, camera, size.width, size.height, radius,
        healthAnchor.current ? { anchor: healthAnchor.current, width: OVERHEAD_HEALTH_CONFIG.selfWidth, height: OVERHEAD_HEALTH_CONFIG.selfHeightBound,
          distanceFactor: OVERHEAD_HEALTH_CONFIG.selfDistanceFactor } : undefined);
      visual.current.visible = !scoped && !blocked;
      if (blocked !== lastObscured.current) {
        lastObscured.current = blocked; setObscured(blocked);
        if (import.meta.env.DEV) console.info('[self.clearance]', JSON.stringify({ hidden: blocked, radius }));
      }
    }
  });
  useAfterPhysicsStep(() => {
    if (!import.meta.env.DEV || !body.current) return;
    const sample = diagnostics.current;
    const active = Boolean(sample.result && (sample.result.jumped || !sample.result.grounded
      || Math.hypot(sample.result.desired.x, sample.result.desired.z) > 0.000001));
    sample.ticks += 1;
    if (active !== sample.wasActive || (active && sample.ticks % 30 === 0)) {
      console.info('[movement.check]', JSON.stringify({
        position: body.current.translation(), active, lifeStatus: playerHealth.getSnapshot().status, weapon: loadout.getSnapshot().active, groundSpeed: loadout.getSpeed(), spreadAngle: motion.getSnapshot(), facingYaw: facing.getYaw(), ...sample.result,
      }));
    }
    sample.wasActive = active;
  });
  return (
    <RigidBody ref={body} type="kinematicPosition" position={position} colliders={false}>
      <CapsuleCollider args={[capsuleHalfHeight, radius]} {...COLLIDER_MATERIALS.player} collisionGroups={COLLISION_GROUPS.player} />
      <group ref={visual} visible={!scoped && !obscured}>
        <PlayerOverheadHealth anchor={healthAnchor} player={playerHealth} hidden={scoped || obscured} />
        {lifeStatus === 'normal' && <RiflePlaceholder loadout={loadout} />}
        <BlockAvatar headColor="#efb079" bodyColor="#d87136" />
      </group>
    </RigidBody>
  );
}
