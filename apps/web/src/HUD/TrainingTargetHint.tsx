import { useSyncExternalStore } from 'react';
import type { LocalTrainingRange } from '../weapons';
import './trainingHit.css';
export function TrainingTargetHint({ range }: { range: LocalTrainingRange }) {
  const state = useSyncExternalStore(range.subscribe, range.getSnapshot);
  return <>
    {state.hitCount > 0 && <div key={state.hitCount} className="training-hit" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 28 28"><path d="M3 3L9 9M19 19L25 25M25 3L19 9M9 19L3 25" stroke="#ffe267" strokeWidth="3" /></svg>
    </div>}
  </>;
}
