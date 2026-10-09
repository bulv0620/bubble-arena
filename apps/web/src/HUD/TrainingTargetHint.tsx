import { useSyncExternalStore } from 'react';
import type { LocalTrainingTarget } from '../weapons';

export function TrainingTargetHint({ target }: { target: LocalTrainingTarget }) {
  const state = useSyncExternalStore(target.subscribe, target.getSnapshot);
  return <output aria-live="polite" style={{ position: 'absolute', top: 112, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    练习靶 HP：{state.hp} / {state.maxHp} · 受击：{state.hitCount}
  </output>;
}
