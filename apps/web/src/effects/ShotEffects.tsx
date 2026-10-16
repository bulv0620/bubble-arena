import { useRef, useState, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Vector3, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { ShotFeedback, SHOT_EFFECT_CONFIG } from './ShotFeedback';
import { skipEffectRaycast } from './skipEffectRaycast';
import { tracerSegment, TRACER_PROFILES } from './tracerSegment';
import { updateMuzzleFlashPose } from './muzzleFlashPose';

/** Permanent bounded mesh pool, disposed by R3F; no per-shot geometry accumulation. */
export function ShotEffects({ feedback, muzzleAnchor }: { feedback: ShotFeedback; muzzleAnchor: RefObject<Group | null> }) {
  const muzzle = useRef<Group>(null), flashCore = useRef<Mesh>(null), flashRing = useRef<Mesh>(null), impact = useRef<Mesh>(null);
  const traces = useRef<(Mesh | null)[]>([]), impacts = useRef<(Mesh | null)[]>([]);
  const [direction] = useState(() => new Vector3()), [axis] = useState(() => new Vector3(0, 1, 0));
  useFrame((_, dt) => {
    const active = feedback.step(dt);
    const flash = feedback.getMuzzleState();
    if (muzzle.current) {
      updateMuzzleFlashPose(muzzle.current, muzzleAnchor.current, flash.weapon, flash.active);
      muzzle.current.scale.setScalar(.65 + flash.strength * .35);
    }
    for (const mesh of [flashCore.current, flashRing.current]) if (mesh) (mesh.material as MeshBasicMaterial).opacity = flash.strength;
    const volley = feedback.getPelletState();
    if (impact.current) {
      impact.current.visible = Boolean(active.impact && volley.pellets.length === 0);
      if (active.impact) impact.current.position.copy(active.impact);
    }
    const profile = TRACER_PROFILES[volley.weapon];
    traces.current.forEach((mesh, index) => {
      if (!mesh) return;
      const pellet = volley.pellets[index], origin = volley.origin;
      mesh.visible = false;
      if (pellet && origin && profile && volley.showTraces) {
        direction.set(pellet.point.x - origin.x, pellet.point.y - origin.y, pellet.point.z - origin.z);
        const length = direction.length();
        const segment = tracerSegment(length, volley.age, volley.weapon);
        if (!segment || segment.end - segment.start <= 1e-6) return;
        direction.divideScalar(length);
        mesh.position.copy(origin).addScaledVector(direction, (segment.start + segment.end) / 2);
        mesh.quaternion.setFromUnitVectors(axis, direction);
        mesh.scale.set(profile.radius, segment.end - segment.start, profile.radius);
        const material = mesh.material as MeshBasicMaterial;
        material.color.set(profile.color); material.opacity = segment.opacity;
        mesh.visible = true;
      }
    });
    impacts.current.forEach((mesh, index) => {
      if (!mesh) return;
      const pellet = volley.pellets[index]; mesh.visible = Boolean(pellet?.hit && volley.showImpacts);
      if (pellet) mesh.position.copy(pellet.point);
      (mesh.material as MeshBasicMaterial).opacity = Math.max(0, 1 - volley.age / SHOT_EFFECT_CONFIG.pelletImpactDuration);
    });
  });
  return <group name="shot-effects" raycast={skipEffectRaycast}>
    <group ref={muzzle} name="muzzle-flash" visible={false}>
      <mesh ref={flashCore} position={[0, 0, .055]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[SHOT_EFFECT_CONFIG.muzzleRadius, .24, 5]} />
        <meshBasicMaterial color="#eaffff" transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={flashRing} position={[0, 0, .02]}>
        <torusGeometry args={[.17, .012, 5, 12]} />
        <meshBasicMaterial color="#7ee8ff" transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
    {Array.from({ length: SHOT_EFFECT_CONFIG.pelletCapacity }, (_, index) => <group key={index}>
      <mesh ref={mesh => { traces.current[index] = mesh; }} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshBasicMaterial color="#c6f4ff" transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={mesh => { impacts.current[index] = mesh; }} visible={false}>
        <sphereGeometry args={[SHOT_EFFECT_CONFIG.pelletImpactRadius, 8, 6]} />
        <meshBasicMaterial color="#b7fff1" transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>)}
    <mesh ref={impact} visible={false}>
      <sphereGeometry args={[SHOT_EFFECT_CONFIG.impactRadius, 10, 8]} />
      <meshBasicMaterial color="#b2faff" transparent opacity={0.8} toneMapped={false} />
    </mesh>
  </group>;
}
