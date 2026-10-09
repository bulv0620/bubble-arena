import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { ShotFeedback, SHOT_EFFECT_CONFIG } from './ShotFeedback';

/** Two permanent meshes, disposed by R3F on unmount; no per-shot object accumulation. */
export function ShotEffects({ feedback }: { feedback: ShotFeedback }) {
  const muzzle = useRef<Mesh>(null), impact = useRef<Mesh>(null);
  useFrame((_, dt) => {
    const active = feedback.step(dt);
    if (muzzle.current) { muzzle.current.visible = !!active.muzzle; if (active.muzzle) muzzle.current.position.copy(active.muzzle); }
    if (impact.current) { impact.current.visible = !!active.impact; if (active.impact) impact.current.position.copy(active.impact); }
  });
  return <group name="shot-effects">
    <mesh ref={muzzle} visible={false}>
      <sphereGeometry args={[SHOT_EFFECT_CONFIG.muzzleRadius, 8, 6]} />
      <meshBasicMaterial color="#ffe267" toneMapped={false} />
    </mesh>
    <mesh ref={impact} visible={false}>
      <sphereGeometry args={[SHOT_EFFECT_CONFIG.impactRadius, 10, 8]} />
      <meshBasicMaterial color="#b2faff" transparent opacity={0.8} toneMapped={false} />
    </mesh>
  </group>;
}
