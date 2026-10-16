import {useSyncExternalStore} from 'react';
import type {LocalLoadout} from '../weapons/LocalLoadout';
export function SprintEffects({loadout}:{loadout:LocalLoadout}){
 const {sprinting}=useSyncExternalStore(loadout.subscribe,loadout.getSnapshot);
 return sprinting?<div className="sprint-screen" aria-hidden="true"><i/><i/><i/><i/></div>:null;
}
