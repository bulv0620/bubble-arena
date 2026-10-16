import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { BUBBLE_TRAP_CONFIG as config } from '@bubble-arena/shared';
import { BlockAvatar } from './BlockAvatar';
const noRaycast=()=>{};
/** Procedural whitebox state visual. The shell is visual-only; target sensor shares config. */
export function BubbleAvatar({bubbled,headColor,bodyColor}:{bubbled:boolean;headColor:string;bodyColor:string}){
  const body=useRef<Group>(null);
  useFrame(({clock})=>{if(!body.current)return;const t=clock.elapsedTime;body.current.position.y=bubbled?config.floatHeight+Math.sin(t*2)*.06:0;body.current.rotation.z=bubbled?Math.sin(t*1.7)*.1:0;body.current.scale.setScalar(bubbled?config.avatarScale:1);});
  return <group><group ref={body}><BlockAvatar headColor={headColor} bodyColor={bodyColor}/></group>{bubbled&&<group position={[0,config.centerY,0]}>
    <mesh raycast={noRaycast}><sphereGeometry args={[config.radius,32,24]}/><meshPhysicalMaterial color="#76e9ff" transparent opacity={.22} roughness={.08} metalness={.05} clearcoat={1} depthWrite={false}/></mesh>
    <mesh rotation={[.2,.2,.3]} raycast={noRaycast}><torusGeometry args={[config.radius,.018,8,64,Math.PI*1.3]}/><meshBasicMaterial color="#b9faff" transparent opacity={.65} depthWrite={false}/></mesh>
    <mesh position={[-.38,.64,-.61]} rotation={[.2,-.3,.3]} raycast={noRaycast}><circleGeometry args={[.19,24]}/><meshBasicMaterial color="#efffff" transparent opacity={.7} depthWrite={false}/></mesh>
  </group>}</group>;
}
