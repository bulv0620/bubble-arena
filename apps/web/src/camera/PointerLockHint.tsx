import { useSyncExternalStore } from 'react';
import type { PointerLockInput, PointerLockStatus } from './PointerLockInput';

const messages: Record<PointerLockStatus, string> = {
  idle: '点击画布锁定鼠标 · WASD：移动 · Space：跳跃',
  requesting: '正在锁定鼠标…',
  locked: '鼠标已锁定 · 移动鼠标：转镜头 · Esc：释放',
  error: '锁定失败：可按住左键拖动镜头，或点击重试 · Esc：释放',
  unsupported: '浏览器不支持锁定：按住左键拖动镜头，或使用桌面 Chrome',
};
export function PointerLockHint({ control }: { control: PointerLockInput }) {
  const status = useSyncExternalStore(control.subscribe, control.getSnapshot);
  return <output aria-live="polite" style={{ position: 'absolute', bottom: 12, left: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    {messages[status]}
  </output>;
}
