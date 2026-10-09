import { useSyncExternalStore } from 'react';
import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import type { RifleMotion } from '../weapons';
export function SpreadHint({ motion }: { motion: RifleMotion }) {
  const angle = useSyncExternalStore(motion.subscribe, motion.getSnapshot);
  return <output className="aim-mode">{angle > RIFLE_SPREAD_CONFIG.normal ? '↗ 散布增大 · 停火后恢复' : '○ 步枪 · 稳定射击'}</output>;
}
