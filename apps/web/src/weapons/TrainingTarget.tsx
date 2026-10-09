import { useEffect, useRef } from 'react';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import type { Collider } from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, TRAINING_TARGET_CONFIG } from '@bubble-arena/shared';
import type { TrainingTargets } from './TrainingTargets';
import type { LocalTrainingTarget } from './LocalTrainingTarget';

/** Engineering dummy: visual capsule and hit sensor share dimensions. No solid movement collision. */
export function TrainingTarget({ registry, target }: { registry: TrainingTargets; target: LocalTrainingTarget }) {
  const collider = useRef<Collider>(null);
  const { position, radius, capsuleHalfHeight } = TRAINING_TARGET_CONFIG;
  useEffect(() => {
    if (!collider.current) return;
    return registry.register(collider.current.handle, target);
  }, [registry, target]);
  return <RigidBody type="fixed" colliders={false} position={[...position]}>
    <CapsuleCollider ref={collider} sensor args={[capsuleHalfHeight, radius]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <mesh castShadow receiveShadow>
      <capsuleGeometry args={[radius, capsuleHalfHeight * 2, 8, 16]} />
      <meshStandardMaterial color="#3ca5ba" roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.2, radius + 0.01]}>
      <torusGeometry args={[0.18, 0.025, 8, 24]} />
      <meshStandardMaterial color="#ffffff" roughness={0.8} />
    </mesh>
  </RigidBody>;
}
