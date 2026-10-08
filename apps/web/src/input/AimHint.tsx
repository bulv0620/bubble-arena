import { useSyncExternalStore } from 'react';
import type { AimInput } from './AimInput';

export function AimHint({ input }: { input: AimInput }) {
  const aiming = useSyncExternalStore(input.subscribe, input.getSnapshot);
  return <output aria-live="polite" style={{ position: 'absolute', top: 12, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    {aiming ? '瞄准中 · 松开右键恢复' : '普通视角 · 按住右键瞄准'}
  </output>;
}
