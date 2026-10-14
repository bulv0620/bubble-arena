import { LocalMatch } from './LocalMatch';
import { LocalTeamScore } from '../player/LocalTeamScore';
import { LocalRespawn } from '../player/LocalRespawn';
import { LocalRescuePractice } from '../player/LocalRescuePractice';
import { LocalPlayerHealth } from '../player/LocalPlayerHealth';
import { ShotFeedback } from '../effects/ShotFeedback';
import { LocalTrainingRange } from '../weapons/LocalTrainingRange';
import { TrainingTargets } from '../weapons/TrainingTargets';
import { RifleRecoil } from '../weapons/RifleRecoil';
import { RifleMotion } from '../weapons/RifleMotion';
import { LocalLoadout } from '../weapons/LocalLoadout';
import { LocalBubbleFlight } from '../weapons/LocalBubbleFlight';
import type { MatchConfig, PrimaryWeaponId } from '@bubble-arena/shared';

/** Replace local training data without replacing the Canvas/HTML portal host. */
export function createTrainingSession(primary: PrimaryWeaponId = 'rifle', options: { match?: boolean; config?: MatchConfig } = {}) {
  const match = new LocalMatch(options.match ?? false, options.config);
  const score = new LocalTeamScore(match.canPlay), loadout = new LocalLoadout(primary, match.canPlay, match.canConfigure), targets = new TrainingTargets(), playerHealth = new LocalPlayerHealth(score, match.canPlay);
  const rescue = new LocalRescuePractice(playerHealth, loadout, score), recoil = new RifleRecoil(), feedback = new ShotFeedback(), motion = new RifleMotion(loadout);
  const range = new LocalTrainingRange(), bubbles = new LocalBubbleFlight(targets, playerHealth.canCauseControl);
  const inputResets = new Set<() => void>();
  let disposed = false;
  return {
    bindInputReset(reset: () => void) {
      if (typeof reset !== 'function') throw new TypeError('Invalid session input reset');
      if (disposed) return () => {};
      inputResets.add(reset); return () => { inputResets.delete(reset); };
    },
    dispose() {
      if (disposed) return; disposed = true; match.dispose();
      for (const reset of inputResets) reset(); inputResets.clear();
      playerHealth.clearPending(); rescue.dispose(); bubbles.clear(); targets.dispose(); feedback.clear(); recoil.reset(); motion.reset();
      for (const entry of range.entries) entry.target.damageNumbers.clear();
    },
    match, score, range, targets, bubbles, playerHealth, rescue, respawn: new LocalRespawn(playerHealth, loadout, rescue, motion, feedback, recoil),
    recoil, feedback, motion, loadout,
  };
}

/** Replace the entire per-match identity scope; never carry ready/actions into the next match. */
export function restartTrainingSession(previous: ReturnType<typeof createTrainingSession>) {
  const next = createTrainingSession(previous.loadout.getSnapshot().primary, { match: previous.match.enabled, config: previous.match.rule.config });
  previous.dispose(); return next;
}
