import { useEffect, useRef } from 'react';
import { BallCollider, CapsuleCollider, RigidBody, useBeforePhysicsStep } from '@react-three/rapier';
import type { Collider } from '@dimforge/rapier3d-compat';
import { BLOCK_AVATAR_CONFIG, COLLISION_GROUPS } from '@bubble-arena/shared';
import { TargetOverheadHealth } from '../HUD/OverheadHealth';
import { BlockAvatar } from '../visuals';
import type { TrainingTargets } from './TrainingTargets';
import type { LocalTrainingTarget } from './LocalTrainingTarget';

/** Engineering dummy: visual-matched head/body sensors, no solid movement collision. */
export function TrainingTarget({ registry, target, position, label }: { registry: TrainingTargets; target: LocalTrainingTarget; label: string; position: readonly [number, number, number] }) {
  useBeforePhysicsStep(() => { target.step(); });
  const head = useRef<Collider>(null), body = useRef<Collider>(null);
  const { headY, headRadius, bodyY, bodyRadius, bodyHalfHeight } = BLOCK_AVATAR_CONFIG;
  useEffect(() => {
    if (!head.current || !body.current) return;
    const releaseHead = registry.register(head.current.handle, target, 'head');
    try {
      const releaseBody = registry.register(body.current.handle, target, 'body');
      return () => { releaseHead(); releaseBody(); };
    } catch (error) { releaseHead(); throw error; }
  }, [registry, target]);
  return <RigidBody type="fixed" colliders={false} position={[...position]}>
    <BallCollider ref={head} sensor position={[0, headY, 0]} args={[headRadius]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <CapsuleCollider ref={body} sensor position={[0, bodyY, 0]} args={[bodyHalfHeight, bodyRadius]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <TargetOverheadHealth target={target} label={label} />
    <group rotation={[0, Math.PI, 0]}>
      <BlockAvatar headColor="#75c9cf" bodyColor="#267a94" />
    </group>
  </RigidBody>;
}
