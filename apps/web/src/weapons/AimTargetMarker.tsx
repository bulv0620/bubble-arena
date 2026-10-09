import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { ScreenAimTarget } from './screenAimRay';

/** Development proof of aim point only: no physics collider or shot effect. */
export function AimTargetMarker({ target }: { target: RefObject<ScreenAimTarget | null> }) {
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    if (!mesh.current) return;
    const sample = target.current;
    mesh.current.visible = sample?.status === 'hit';
    if (sample) mesh.current.position.set(sample.point.x, sample.point.y, sample.point.z);
  });
  return <mesh ref={mesh} visible={false} renderOrder={10}>
    <sphereGeometry args={[0.06, 12, 8]} />
    <meshBasicMaterial color="#ffd65c" depthTest={false} depthWrite={false} />
  </mesh>;
}
