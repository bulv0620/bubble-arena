import { useSyncExternalStore } from 'react';
import type { LocalArenaInteractions } from '../player/LocalArenaInteractions';
export function ArenaInteractionHint({interaction}:{interaction:LocalArenaInteractions}){
  const state=useSyncExternalStore(interaction.subscribe,interaction.getSnapshot),progress=state.progress??state.receiving;
  if(!state.kind&&state.receiving===null)return null;
  return <aside className="arena-interaction-hint">{progress!==null?<><b>{state.receiving!==null?'正在被救援':'救援中'}</b><div role="progressbar" aria-label="救援进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress*100)}><i style={{width:`${progress*100}%`}}/></div></>:<b><kbd>E</kbd> {state.kind==='kick'?'踢爆':'救援'}</b>}</aside>;
}
