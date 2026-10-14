import { useSyncExternalStore } from 'react';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
export function HealthHint({ player }: { player: LocalPlayerHealth }) {
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const eliminated = state.status === 'eliminated' || state.status === 'respawning', downed = state.status === 'downed', hp = downed ? state.downedHp : state.hp, maxHp = downed ? state.maxDownedHp : state.maxHp;
  return <output className={`hud-panel player-health ${eliminated ? 'eliminated' : downed ? 'downed' : ''} ${state.protected ? 'protected' : ''}`} aria-label={`自身${downed ? '倒地' : ''} HP：${hp} / ${maxHp}`}>
    <div className="health-emblem" aria-hidden="true">✚</div>
    <div className="health-info"><small>泡泡先锋 <span>{state.status === 'respawning' ? '复活' : eliminated ? '淘汰' : downed ? '倒地' : state.protected ? '保护中' : 'YOU'}</span></small>
      <div className="health-value"><b>{hp}</b><span> / {maxHp} {downed ? '倒地生命' : 'HP'}</span></div>
      <div className="health-track"><i style={{ width: `${hp / maxHp * 100}%` }} /></div>
    </div>
  </output>;
}
