import { useSyncExternalStore } from 'react';
import type { LocalArenaInteractions } from '../player/LocalArenaInteractions';
export function ArenaInteractionHint({interaction}:{interaction:LocalArenaInteractions}){
  const state=useSyncExternalStore(interaction.subscribe,interaction.getSnapshot);
  if(!state.kind&&state.receiving===null)return null;
  const active=state.progress!==null||state.receiving!==null;
  const label=state.progress!==null?(state.kind==='kick'?'击破中':'救援中'):state.receiving!==null?'正在被救援':state.kind==='kick'?'踢破水球':'救援队友';
  return <aside className="arena-interaction-hint" role="status" aria-label={label}>
    <b>{!active&&<><kbd>E</kbd> </>}{label}</b>
  </aside>;
}
