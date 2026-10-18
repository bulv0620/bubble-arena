import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { BUBBLE_CONFIG, PHYSICS_CONFIG } from '@bubble-arena/shared';
import type { LocalBubbleFlight } from './LocalBubbleFlight';
import { skipEffectRaycast } from '../effects/skipEffectRaycast';
/** Fixed-size visual pool reads simulation snapshots; it owns no flight or hit rules. */
export function BubbleVisuals({ bubbles }: { bubbles: LocalBubbleFlight }) {
  const pool = useRef<(Mesh | null)[]>([]), burst = useRef<Mesh>(null);
  useFrame(() => {
    const flying = bubbles.flight.getSnapshot();
    pool.current.forEach((mesh, index) => {
      if (!mesh) return;
      mesh.visible = index < flying.length;
      if (flying[index]) mesh.position.set(flying[index].position.x,flying[index].position.y,flying[index].position.z);
    });
    if (!burst.current) return;
    const explosion = bubbles.getExplosion(); burst.current.visible = explosion !== null;
    if (explosion) {
      burst.current.position.set(explosion.point.x, explosion.point.y, explosion.point.z);
      burst.current.scale.setScalar(.2 + (1 - explosion.ticks / Math.ceil(.3 * PHYSICS_CONFIG.tickRate)) * BUBBLE_CONFIG.explosionRadius);
    }
  });
  return <group name="bubble-effect-pool" raycast={skipEffectRaycast}>
    {Array.from({ length: BUBBLE_CONFIG.capacity }, (_, i) => <mesh key={i} ref={mesh => { pool.current[i] = mesh; }} visible={false}>
      <sphereGeometry args={[BUBBLE_CONFIG.radius, 12, 8]} /><meshStandardMaterial color="#a2fff0" emissive="#27cbb6" emissiveIntensity={.5} transparent opacity={.65} roughness={.12} />
    </mesh>)}
    <mesh ref={burst} visible={false}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#86ffee" transparent opacity={.2} depthWrite={false} wireframe /></mesh>
  </group>;
}
