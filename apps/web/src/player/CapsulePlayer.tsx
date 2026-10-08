import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import { PLAYER_CONFIG } from '@bubble-arena/shared';

interface CapsulePlayerProps {
  /** World-space capsule center, not the foot position. */
  position: [number, number, number];
}

export function CapsulePlayer({ position }: CapsulePlayerProps) {
  const { radius, capsuleHalfHeight } = PLAYER_CONFIG;
  return (
    <RigidBody type="kinematicPosition" position={position} colliders={false}>
      <CapsuleCollider args={[capsuleHalfHeight, radius]} />
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[radius, capsuleHalfHeight * 2, 8, 16]} />
        <meshStandardMaterial color="#ef9350" roughness={0.7} />
      </mesh>
    </RigidBody>
  );
}
