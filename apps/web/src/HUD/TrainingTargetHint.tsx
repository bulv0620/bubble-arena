import { useSyncExternalStore } from 'react';
import type { LocalTrainingRange } from '../weapons';
import './trainingHit.css';

export function TrainingTargetHint({ range }: { range: LocalTrainingRange }) {
  const state = useSyncExternalStore(range.subscribe, range.getSnapshot);
  return <><output aria-live="polite" style={{ position: 'absolute', top: 112, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    {state.targets.map((target, index) => <div key={range.entries[index].id}>
      {range.entries[index].label} HP：{target.hp} / {target.maxHp} · 受击：{target.hitCount}{target.hp === 0 && ' · 已清空'}
    </div>)}
  </output>
    {state.hitCount > 0 && <div key={state.hitCount} className="training-hit" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 28 28">
        <path d="M3 3L9 9M19 19L25 25M25 3L19 9M9 19L3 25" stroke="#ffe267" strokeWidth="3" />
      </svg>
      <span>命中 −{state.lastDamage}</span>
    </div>}
  </>;
}
