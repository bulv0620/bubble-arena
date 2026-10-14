import { useSyncExternalStore } from 'react';
import type { PointerLockInput, PointerLockStatus } from './PointerLockInput';
import type { LocalLoadout } from '../weapons/LocalLoadout';

const messages: Record<PointerLockStatus, string> = {
  idle: '点击画布锁定鼠标 · WASD：移动 · Space：跳跃',
  requesting: '正在锁定鼠标…',
  locked: '鼠标已锁定 · 移动鼠标：转镜头 · Esc：设置',
  error: '锁定失败：可按住左键拖动镜头，或点击重试 · Esc：设置',
  unsupported: '浏览器不支持锁定：按住左键拖动镜头，或使用桌面 Chrome',
};
export function PointerLockHint({ control, loadout }: { control: PointerLockInput; loadout: LocalLoadout }) {
  const status = useSyncExternalStore(control.subscribe, control.getSnapshot);
  const downed = useSyncExternalStore(loadout.subscribe, () => loadout.getSnapshot().lifeStatus === 'downed');
  return <output aria-live="polite" className={`control-hint ${status === 'locked' ? 'locked' : ''}`}>
    {status === 'idle' && downed ? '点击画布锁定鼠标 · WASD：缓慢移动 · Esc：设置' : messages[status]}
  </output>;
}
