import { useSyncExternalStore } from 'react';
import type { AimInput } from './AimInput';

export function AimHint({ input }: { input: AimInput }) {
  const aiming = useSyncExternalStore(input.subscribe, input.getSnapshot);
  return <output aria-live="polite" style={{ position: 'absolute', top: 12, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    {aiming ? '精确射击 · 散布收小 / 移动减速' : '普通射击 · 按住右键收束散布'}
  </output>;
}
