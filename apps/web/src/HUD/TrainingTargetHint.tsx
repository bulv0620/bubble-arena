import { useSyncExternalStore } from 'react';
import type { LocalTrainingTarget } from '../weapons';
import './trainingHit.css';

export function TrainingTargetHint({ target }: { target: LocalTrainingTarget }) {
  const state = useSyncExternalStore(target.subscribe, target.getSnapshot);
  return <><output aria-live="polite" style={{ position: 'absolute', top: 112, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    练习靶 HP：{state.hp} / {state.maxHp} · 受击：{state.hitCount}
    {state.hp === 0 && <span> · 已清空（刷新重置）</span>}
  </output>
    {state.hitCount > 0 && <div key={state.hitCount} className="training-hit" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 28 28">
        <path d="M3 3L9 9M19 19L25 25M25 3L19 9M9 19L3 25" stroke="#ffe267" strokeWidth="3" />
      </svg>
      <span>命中 −{state.lastDamage}</span>
    </div>}
  </>;
}
