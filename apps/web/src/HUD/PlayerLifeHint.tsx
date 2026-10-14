import { useSyncExternalStore } from 'react';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
export function PlayerLifeHint({ player }: { player: LocalPlayerHealth }) {
  const status = useSyncExternalStore(player.subscribe, () => player.getSnapshot().status);
  if (status !== 'downed') return null;
  return <aside className="life-state-hint" role="status"><b>已倒地</b>
    <span>WASD 缓慢移动 · 鼠标观察</span><small>无法跳跃、开火、换弹或切换武器</small>
  </aside>;
}
