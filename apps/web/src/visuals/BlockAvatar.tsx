import { PLAYER_CONFIG } from '@bubble-arena/shared';

/** Shared engineering silhouette, facing local -Z; the hit capsule stays unified. */
export function BlockAvatar({ headColor, bodyColor }: { headColor: string; bodyColor: string }) {
  const radius = PLAYER_CONFIG.radius;
  const headY = PLAYER_CONFIG.height / 2 - radius;
  return <group name="block-avatar">
    <mesh name="head-block" position={[0, headY, 0]} castShadow receiveShadow>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial color={headColor} roughness={0.8} />
    </mesh>
    <mesh name="round-face" position={[0, headY, -radius - 0.006]} rotation={[0, Math.PI, 0]}>
      <circleGeometry args={[radius * 0.68, 24]} />
      <meshStandardMaterial color="#fff0d6" roughness={0.8} />
    </mesh>
    <mesh name="body-block" position={[0, -radius, 0]} castShadow receiveShadow>
      <capsuleGeometry args={[radius * 0.86, PLAYER_CONFIG.height - radius * 2 - radius * 2 * 0.86, 8, 16]} />
      <meshStandardMaterial color={bodyColor} roughness={0.8} />
    </mesh>
  </group>;
}
