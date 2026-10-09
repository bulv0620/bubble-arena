import { BLOCK_AVATAR_CONFIG } from '@bubble-arena/shared';

/** Shared engineering silhouette, facing local -Z. */
export function BlockAvatar({ headColor, bodyColor }: { headColor: string; bodyColor: string }) {
  const { headRadius: radius, headY, bodyY, bodyRadius, bodyHalfHeight } = BLOCK_AVATAR_CONFIG;
  return <group name="block-avatar">
    <mesh name="head-block" position={[0, headY, 0]} castShadow receiveShadow>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial color={headColor} roughness={0.8} />
    </mesh>
    <mesh name="round-face" position={[0, headY, -radius - 0.006]} rotation={[0, Math.PI, 0]}>
      <circleGeometry args={[radius * 0.68, 24]} />
      <meshStandardMaterial color="#fff0d6" roughness={0.8} />
    </mesh>
    <mesh name="body-block" position={[0, bodyY, 0]} castShadow receiveShadow>
      <capsuleGeometry args={[bodyRadius, bodyHalfHeight * 2, 8, 16]} />
      <meshStandardMaterial color={bodyColor} roughness={0.8} />
    </mesh>
  </group>;
}
