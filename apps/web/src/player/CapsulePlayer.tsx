import { useEffect, useRef, useState, type RefObject } from 'react';
import { Vector3, type Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { COLLIDER_MATERIALS, COLLISION_GROUPS, PLAYER_CONFIG, type CameraHeading } from '@bubble-arena/shared';
import type { KeyboardInput } from './KeyboardInput';
import { RapierMovement } from './RapierMovement';
import { PlayerFacing } from './PlayerFacing';
import type { AimInput } from '../input';
import { BlockAvatar } from '../visuals';
import { RiflePlaceholder } from '../weapons';

interface CapsulePlayerProps {
  /** World-space capsule center, not the foot position. */
  position: [number, number, number];
  input: KeyboardInput;
  bodyRef: RefObject<RapierRigidBody | null>;
  view: RefObject<CameraHeading>;
  aim: AimInput;
  facingYaw: RefObject<number>;
}

export function CapsulePlayer({ position, input, bodyRef: body, view, aim, facingYaw }: CapsulePlayerProps) {
  const { radius, capsuleHalfHeight } = PLAYER_CONFIG;
  const movement = useRef<RapierMovement | null>(null);
  const visual = useRef<Group | null>(null);
  const [facing] = useState(() => new PlayerFacing());
  const diagnostics = useRef({ ticks: 0, wasActive: false, wasAiming: false, result: undefined as ReturnType<RapierMovement['step']> });
  const { world } = useRapier();
  useEffect(() => {
    const adapter = new RapierMovement(world);
    facing.reset();
    facingYaw.current = 0;
    movement.current = adapter;
    return () => {
      movement.current = null;
      adapter.dispose();
    };
  }, [world, facing, facingYaw]);
  useBeforePhysicsStep(() => {
    const rigidBody = body.current;
    if (rigidBody && rigidBody.numColliders() > 0) {
      const result = movement.current?.step(rigidBody, rigidBody.collider(0),
        { ...input.getSnapshot(), aiming: aim.getSnapshot() }, input.consumeJump(), view.current.yaw);
      facing.step(view.current.yaw);
      facingYaw.current = facing.getYaw();
      if (import.meta.env.DEV) diagnostics.current.result = result;
    }
  });
  const [forward] = useState(() => new Vector3());
  useFrame(({ camera }) => {
    camera.getWorldDirection(forward);
    facing.step(Math.atan2(-forward.x, -forward.z));
    facingYaw.current = facing.getYaw();
    if (visual.current) visual.current.rotation.y = facing.getYaw();
  });
  useAfterPhysicsStep(() => {
    if (!import.meta.env.DEV || !body.current) return;
    const sample = diagnostics.current;
    const active = Boolean(sample.result && (sample.result.jumped || !sample.result.grounded
      || Math.hypot(sample.result.desired.x, sample.result.desired.z) > 0.000001));
    sample.ticks += 1;
    const aiming = aim.getSnapshot();
    if (active !== sample.wasActive || aiming !== sample.wasAiming || ((active || aiming) && sample.ticks % 30 === 0)) {
      console.info('[movement.check]', JSON.stringify({
        position: body.current.translation(), active, aiming, facingYaw: facing.getYaw(), ...sample.result,
      }));
    }
    sample.wasActive = active;
    sample.wasAiming = aiming;
  });
  return (
    <RigidBody ref={body} type="kinematicPosition" position={position} colliders={false}>
      <CapsuleCollider args={[capsuleHalfHeight, radius]} {...COLLIDER_MATERIALS.player} collisionGroups={COLLISION_GROUPS.player} />
      <group ref={visual}>
        <RiflePlaceholder />
        <BlockAvatar headColor="#efb079" bodyColor="#d87136" />
      </group>
    </RigidBody>
  );
}
