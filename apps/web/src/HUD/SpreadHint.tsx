import { useSyncExternalStore } from 'react';
import { WEAPON_HANDLING } from '@bubble-arena/shared';
import type { RifleMotion } from '../weapons';
import type { LocalLoadout } from '../weapons/LocalLoadout';
export function SpreadHint({ motion, loadout }: { motion: RifleMotion; loadout: LocalLoadout }) {
  const angle = useSyncExternalStore(motion.subscribe, motion.getSnapshot);
  const { active, scoped, lifeStatus, rescuing } = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  if (rescuing) return <output className="aim-mode">救援中</output>;
  if (lifeStatus !== 'normal') return <output className="aim-mode">倒地 · 缓慢移动</output>;
  return <output className="aim-mode">{scoped ? '⊕ 狙击开镜' : `${WEAPON_HANDLING[active].label} · ${angle > WEAPON_HANDLING[active].spread.normal ? '散布增大' : '稳定射击'}`}</output>;
}
