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
  const score = new LocalTeamScore(), loadout = new LocalLoadout(primary, match.canPlay), targets = new TrainingTargets(), playerHealth = new LocalPlayerHealth(score, match.canPlay);
  const rescue = new LocalRescuePractice(playerHealth, loadout), recoil = new RifleRecoil(), feedback = new ShotFeedback(), motion = new RifleMotion(loadout);
  return {
    match, score, range: new LocalTrainingRange(), targets, bubbles: new LocalBubbleFlight(targets, playerHealth.canCauseControl), playerHealth, rescue, respawn: new LocalRespawn(playerHealth, loadout, rescue, motion, feedback, recoil),
    recoil, feedback, motion, loadout,
  };
}
