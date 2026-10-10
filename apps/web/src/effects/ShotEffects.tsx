import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Mesh } from 'three';
import { ShotFeedback, SHOT_EFFECT_CONFIG } from './ShotFeedback';
import { skipEffectRaycast } from './skipEffectRaycast';

/** Permanent bounded mesh pool, disposed by R3F; no per-shot geometry accumulation. */
export function ShotEffects({ feedback }: { feedback: ShotFeedback }) {
  const muzzle = useRef<Mesh>(null), impact = useRef<Mesh>(null);
  const traces = useRef<(Mesh | null)[]>([]), impacts = useRef<(Mesh | null)[]>([]);
  const [direction] = useState(() => new Vector3()), [axis] = useState(() => new Vector3(0, 1, 0));
  useFrame((_, dt) => {
    const active = feedback.step(dt);
    if (muzzle.current) { muzzle.current.visible = !!active.muzzle; if (active.muzzle) muzzle.current.position.copy(active.muzzle); }
    if (impact.current) { impact.current.visible = !!active.impact; if (active.impact) impact.current.position.copy(active.impact); }
    const volley = feedback.getPelletState();
    traces.current.forEach((mesh, index) => {
      if (!mesh) return;
      const pellet = volley.pellets[index], origin = volley.origin;
      mesh.visible = Boolean(pellet && origin && volley.showTraces);
      if (pellet && origin) {
        direction.set(pellet.point.x - origin.x, pellet.point.y - origin.y, pellet.point.z - origin.z);
        const length = direction.length();
        mesh.visible = mesh.visible && length > 1e-6;
        mesh.position.set((pellet.point.x + origin.x) / 2, (pellet.point.y + origin.y) / 2, (pellet.point.z + origin.z) / 2);
        if (length > 1e-6) mesh.quaternion.setFromUnitVectors(axis, direction.divideScalar(length));
        mesh.scale.set(1, length, 1);
      }
    });
    impacts.current.forEach((mesh, index) => {
      if (!mesh) return;
      const pellet = volley.pellets[index]; mesh.visible = Boolean(pellet?.hit);
      if (pellet) mesh.position.copy(pellet.point);
    });
  });
  return <group name="shot-effects" raycast={skipEffectRaycast}>
    <mesh ref={muzzle} visible={false}>
      <sphereGeometry args={[SHOT_EFFECT_CONFIG.muzzleRadius, 8, 6]} />
      <meshBasicMaterial color="#ffe267" toneMapped={false} />
    </mesh>
    {Array.from({ length: SHOT_EFFECT_CONFIG.pelletCapacity }, (_, index) => <group key={index}>
      <mesh ref={mesh => { traces.current[index] = mesh; }} visible={false}>
        <cylinderGeometry args={[SHOT_EFFECT_CONFIG.pelletRadius, SHOT_EFFECT_CONFIG.pelletRadius, 1, 5]} />
        <meshBasicMaterial color="#ffdf8c" transparent opacity={.75} toneMapped={false} />
      </mesh>
      <mesh ref={mesh => { impacts.current[index] = mesh; }} visible={false}>
        <sphereGeometry args={[SHOT_EFFECT_CONFIG.pelletImpactRadius, 8, 6]} />
        <meshBasicMaterial color="#b7fff1" toneMapped={false} />
      </mesh>
    </group>)}
    <mesh ref={impact} visible={false}>
      <sphereGeometry args={[SHOT_EFFECT_CONFIG.impactRadius, 10, 8]} />
      <meshBasicMaterial color="#b2faff" transparent opacity={0.8} toneMapped={false} />
    </mesh>
  </group>;
}
