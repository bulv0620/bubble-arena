import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { Mesh } from 'three';
import type { ScreenAimTarget } from './screenAimRay';
import { rifleMuzzlePosition } from './riflePose';
import { queryMuzzleRay } from './muzzleRay';

/** Development-only continuous preview, not an accepted shot or simulation tick. */
export function MuzzleAimDiagnostics({ body, yaw, target }: { body: RefObject<RapierRigidBody | null>;
  yaw: RefObject<number>; target: RefObject<ScreenAimTarget | null> }) {
  const mesh = useRef<Mesh>(null), frames = useRef(0);
  const { world } = useRapier();
  useFrame(() => {
    const center = body.current?.translation();
    const muzzle = center && rifleMuzzlePosition(center, yaw.current);
    const result = center && muzzle && target.current ? queryMuzzleRay(world, center, muzzle, target.current) : null;
    if (mesh.current) {
      mesh.current.visible = Boolean(result && result.status !== 'clear');
      if (result) mesh.current.position.set(result.point.x, result.point.y, result.point.z);
    }
    if (++frames.current % 120 === 0) console.info('[muzzle.preview]', JSON.stringify({ muzzle, result }));
  });
  return <mesh ref={mesh} visible={false} renderOrder={11}>
    <sphereGeometry args={[0.04, 12, 8]} />
    <meshBasicMaterial color="#ff5b58" depthTest={false} depthWrite={false} />
  </mesh>;
}
