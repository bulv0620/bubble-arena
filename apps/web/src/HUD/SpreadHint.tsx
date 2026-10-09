import { useSyncExternalStore } from 'react';
import { WEAPON_HANDLING } from '@bubble-arena/shared';
import type { RifleMotion } from '../weapons';
import type { LocalLoadout } from '../weapons/LocalLoadout';
export function SpreadHint({ motion, loadout }: { motion: RifleMotion; loadout: LocalLoadout }) {
  const angle = useSyncExternalStore(motion.subscribe, motion.getSnapshot);
  const { active, scoped } = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  return <output className="aim-mode">{scoped ? '⊕ 狙击开镜' : `${WEAPON_HANDLING[active].label} · ${angle > WEAPON_HANDLING[active].spread.normal ? '散布增大' : '稳定射击'}`}</output>;
}
