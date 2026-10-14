import { useSyncExternalStore } from 'react';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
export function PlayerLifeHint({ player }: { player: LocalPlayerHealth }) {
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  if (state.status === 'eliminated') return <aside className="life-state-hint eliminated" role="status"><b>已淘汰</b>
    <span>{state.eliminationReason === 'finishing-damage' ? '倒地生命耗尽' : '倒地时间耗尽'}</span>
    <small>Esc → 重置训练可重新开始</small></aside>;
  if (state.status !== 'downed') return null;
  return <aside className="life-state-hint" role="status"><b>已倒地 · 剩余 {state.downedSecondsRemaining} 秒</b>
    <span>WASD 缓慢移动 · 鼠标观察</span><small>等待队友救援 · 倒地生命耗尽或计时结束将淘汰</small>
  </aside>;
}
