import { TRAINING_TARGET_LAYOUT } from '@bubble-arena/shared';
import type { TrainingTargetSnapshot } from '@bubble-arena/game-core';
import { LocalTrainingTarget } from './LocalTrainingTarget';
interface RangeSnapshot { readonly targets: readonly TrainingTargetSnapshot[]; readonly hitCount: number; readonly lastDamage: number }
/** Independent targets; stable aggregate snapshot for one HUD and one hit marker. */
export class LocalTrainingRange {
  readonly entries = Object.freeze(TRAINING_TARGET_LAYOUT.map(entry => Object.freeze({ ...entry, target: new LocalTrainingTarget() })));
  private snapshot: RangeSnapshot = Object.freeze({ targets: Object.freeze(this.entries.map(e => e.target.getSnapshot())), hitCount: 0, lastDamage: 0 });
  getSnapshot = () => {
    const states = this.entries.map(e => e.target.getSnapshot());
    if (states.some((state, index) => state !== this.snapshot.targets[index])) {
      const latest = states.reduce((a, b) => (b.lastHitTick ?? -1) > (a.lastHitTick ?? -1) ? b : a);
      this.snapshot = Object.freeze({ targets: Object.freeze(states), hitCount: states.reduce((sum, s) => sum + s.hitCount, 0), lastDamage: latest.lastDamage });
    }
    return this.snapshot;
  };
  subscribe = (listener: () => void) => {
    const releases = this.entries.map(e => e.target.subscribe(listener));
    return () => { releases.forEach(release => release()); };
  };
}
