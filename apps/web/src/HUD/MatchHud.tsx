import { useSyncExternalStore } from 'react';
import type { LocalMatch } from '../core/LocalMatch';
export function MatchHud({ match }: { match: LocalMatch }) {
  const state = useSyncExternalStore(match.subscribe, match.getSnapshot);
  const ready = useSyncExternalStore(match.subscribe, match.isSceneReady);
  const time = `${Math.floor(state.secondsRemaining / 60).toString().padStart(2, '0')}:${(state.secondsRemaining % 60).toString().padStart(2, '0')}`;
  return <section className="match-hud hud-panel" aria-label="比赛状态">
    <small>{state.phase === 'waiting' ? '等待开始' : state.phase === 'countdown' ? '准备开始' : state.phase === 'finished' ? '比赛结束' : '比赛进行中'} · {match.rule.config.scoreLimit} 分制</small>
    <strong>{state.phase === 'countdown' ? state.countdownRemaining : time}</strong>
    {state.phase === 'waiting' && <button disabled={!ready} onClick={match.requestStart}>{ready ? '开始比赛' : '场景加载中'}</button>}
  </section>;
}
