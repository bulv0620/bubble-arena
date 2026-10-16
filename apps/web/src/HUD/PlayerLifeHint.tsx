import { useSyncExternalStore } from 'react';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
export function PlayerLifeHint({player}:{player:LocalPlayerHealth}){
  const state=useSyncExternalStore(player.subscribe,player.getSnapshot);
  if(state.status==='normal')return null;
  if(state.status==='downed')return <div className="bubble-screen" aria-label="困泡状态"><div className="bubble-screen-glint" aria-hidden="true"/><aside role="status"><b>困泡中</b><strong>{state.downedSecondsRemaining}</strong></aside></div>;
  return <div className="respawn-screen" role="status"><div><span>基地复活</span><strong>{state.status==='respawning'?'…':state.respawnSecondsRemaining}</strong></div></div>;
}
