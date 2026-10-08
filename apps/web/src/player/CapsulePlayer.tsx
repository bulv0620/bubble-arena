import { useEffect, useRef } from 'react';
import { CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { COLLIDER_MATERIALS, COLLISION_GROUPS, PLAYER_CONFIG } from '@bubble-arena/shared';
import type { KeyboardInput } from './KeyboardInput';
import { RapierMovement } from './RapierMovement';

interface CapsulePlayerProps {
  /** World-space capsule center, not the foot position. */
  position: [number, number, number];
  input: KeyboardInput;
}

export function CapsulePlayer({ position, input }: CapsulePlayerProps) {
  const { radius, capsuleHalfHeight } = PLAYER_CONFIG;
  const body = useRef<RapierRigidBody>(null);
  const movement = useRef<RapierMovement | null>(null);
  const diagnostics = useRef({ ticks: 0, wasActive: false, result: undefined as ReturnType<RapierMovement['step']> });
  const { world } = useRapier();
  useEffect(() => {
    const adapter = new RapierMovement(world);
    movement.current = adapter;
    return () => {
      movement.current = null;
      adapter.dispose();
    };
  }, [world]);
  useBeforePhysicsStep(() => {
    const rigidBody = body.current;
    if (rigidBody && rigidBody.numColliders() > 0) {
      const result = movement.current?.step(rigidBody, rigidBody.collider(0), input.getSnapshot(), input.consumeJump());
      if (import.meta.env.DEV) diagnostics.current.result = result;
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
        position: body.current.translation(), active, ...sample.result,
      }));
    }
    sample.wasActive = active;
  });
  return (
    <RigidBody ref={body} type="kinematicPosition" position={position} colliders={false}>
      <CapsuleCollider args={[capsuleHalfHeight, radius]} {...COLLIDER_MATERIALS.player} collisionGroups={COLLISION_GROUPS.player} />
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[radius, capsuleHalfHeight * 2, 8, 16]} />
        <meshStandardMaterial color="#ef9350" roughness={0.7} />
      </mesh>
    </RigidBody>
  );
}
