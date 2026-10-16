import { useRef, useSyncExternalStore } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { LocalArenaInteractions } from '../player/LocalArenaInteractions';
export function BubblePopEffects({interaction}:{interaction:LocalArenaInteractions}){
  const state=useSyncExternalStore(interaction.subscribe,interaction.getSnapshot),mesh=useRef<Mesh>(null),material=useRef<MeshBasicMaterial>(null),life=useRef({sequence:0,born:-1});
  useFrame(({clock,camera})=>{
    if(!mesh.current||!material.current)return;
    if(state.kickSequence!==life.current.sequence){life.current={sequence:state.kickSequence,born:clock.elapsedTime};if(state.kickPosition)mesh.current.position.set(state.kickPosition.x,state.kickPosition.y+.12,state.kickPosition.z);}
    const age=clock.elapsedTime-life.current.born;mesh.current.visible=state.kickSequence>0&&age<.4;
    if(mesh.current.visible){mesh.current.quaternion.copy(camera.quaternion);mesh.current.scale.setScalar(1+age*4);material.current.opacity=Math.max(0,.8-age*2);}
  });
  return <mesh ref={mesh} visible={false} raycast={()=>{}}><torusGeometry args={[.65,.06,8,48]}/><meshBasicMaterial ref={material} color="#aaf9ff" transparent depthWrite={false}/></mesh>;
}
