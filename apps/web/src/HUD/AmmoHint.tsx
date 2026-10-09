import { useSyncExternalStore } from 'react';
import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import type { LocalRifle } from '../weapons';

export function AmmoHint({ rifle }: { rifle: LocalRifle }) {
  const ammo = useSyncExternalStore(rifle.subscribe, rifle.getSnapshot);
  return <output aria-live="polite" style={{ position: 'absolute', top: 58, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    步枪弹药：{ammo.magazine} / {ammo.reserve}{ammo.reloading ? ` · 换弹中（${WEAPON_CONFIGS.rifle.reloadDuration} 秒）` : ammo.magazine === 0 ? ' · 弹匣已空 · R 换弹' : ' · R 换弹'}
  </output>;
}
