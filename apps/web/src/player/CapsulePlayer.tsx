import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Group } from 'three';
import { CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { COLLIDER_MATERIALS, COLLISION_GROUPS, PHYSICS_CONFIG, PLAYER_CONFIG, type CameraHeading } from '@bubble-arena/shared';
import type { KeyboardInput } from './KeyboardInput';
import { RapierMovement } from './RapierMovement';
import { PlayerFacing } from './PlayerFacing';
import type { AimInput } from '../input';

interface CapsulePlayerProps {
  /** World-space capsule center, not the foot position. */
  position: [number, number, number];
  input: KeyboardInput;
  bodyRef: RefObject<RapierRigidBody | null>;
  view: RefObject<CameraHeading>;
  aim: AimInput;
}

export function CapsulePlayer({ position, input, bodyRef: body, view, aim }: CapsulePlayerProps) {
  const { radius, capsuleHalfHeight } = PLAYER_CONFIG;
  const movement = useRef<RapierMovement | null>(null);
  const visual = useRef<Group | null>(null);
  const [facing] = useState(() => new PlayerFacing());
  const diagnostics = useRef({ ticks: 0, wasActive: false, wasAiming: false, result: undefined as ReturnType<RapierMovement['step']> });
  const { world } = useRapier();
  useEffect(() => {
    const adapter = new RapierMovement(world);
    facing.reset();
    movement.current = adapter;
    return () => {
      movement.current = null;
      adapter.dispose();
    };
  }, [world, facing]);
  useBeforePhysicsStep(() => {
    const rigidBody = body.current;
    if (rigidBody && rigidBody.numColliders() > 0) {
      const result = movement.current?.step(rigidBody, rigidBody.collider(0),
        { ...input.getSnapshot(), aiming: aim.getSnapshot() }, input.consumeJump(), view.current.yaw);
      if (result) facing.step(result.allowed.x, result.allowed.z, PHYSICS_CONFIG.timeStep,
        aim.getSnapshot() ? view.current.yaw : undefined);
      if (import.meta.env.DEV) diagnostics.current.result = result;
    }
  });
  useAfterPhysicsStep(() => {
    if (visual.current) visual.current.rotation.y = facing.getYaw();
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
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[radius, capsuleHalfHeight * 2, 8, 16]} />
          <meshStandardMaterial color="#ef9350" roughness={0.7} />
        </mesh>
        {/* Whitebox direction marker; formal character assets still use Blender MCP. */}
        <mesh position={[0, PLAYER_CONFIG.height / 2 + 0.04, -0.12]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.07, 0.3, 4]} />
          <meshStandardMaterial color="#25475a" roughness={0.7} />
        </mesh>
      </group>
    </RigidBody>
  );
}
