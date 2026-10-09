import { useSyncExternalStore } from 'react';
import type { LocalRifle } from '../weapons';

export function AmmoHint({ rifle }: { rifle: LocalRifle }) {
  const ammo = useSyncExternalStore(rifle.subscribe, rifle.getSnapshot);
  return <output aria-live="polite" style={{ position: 'absolute', top: 58, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    步枪弹药：{ammo.magazine} / {ammo.reserve}{ammo.magazine === 0 ? ' · 弹匣已空' : ''}
  </output>;
}
