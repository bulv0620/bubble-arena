import { useSyncExternalStore } from 'react';
import { crosshairSize } from './crosshairSize';
const subscribe=(notify:()=>void)=>{window.addEventListener('resize',notify);return()=>window.removeEventListener('resize',notify);};
const height=()=>window.innerHeight;
export function useReticleSize(angle:number){
  const viewportHeight=useSyncExternalStore(subscribe,height,()=>720);
  return crosshairSize(angle,viewportHeight);
}
