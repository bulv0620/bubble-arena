import { useEffect, useRef } from 'react';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import type { Collider } from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, TRAINING_TARGET_CONFIG } from '@bubble-arena/shared';
import { BlockAvatar } from '../visuals';
import type { TrainingTargets } from './TrainingTargets';
import type { LocalTrainingTarget } from './LocalTrainingTarget';

/** Engineering dummy: shared block silhouette inside a unified hit sensor. No solid movement collision. */
export function TrainingTarget({ registry, target, position }: { registry: TrainingTargets; target: LocalTrainingTarget; position: readonly [number, number, number] }) {
  const collider = useRef<Collider>(null);
  const { radius, capsuleHalfHeight } = TRAINING_TARGET_CONFIG;
  useEffect(() => {
    if (!collider.current) return;
    return registry.register(collider.current.handle, target);
  }, [registry, target]);
  return <RigidBody type="fixed" colliders={false} position={[...position]}>
    <CapsuleCollider ref={collider} sensor args={[capsuleHalfHeight, radius]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <group rotation={[0, Math.PI, 0]}>
      <BlockAvatar headColor="#75c9cf" bodyColor="#267a94" />
    </group>
  </RigidBody>;
}
