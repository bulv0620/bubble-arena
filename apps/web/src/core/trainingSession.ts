import { LocalRescuePractice } from '../player/LocalRescuePractice';
import { LocalPlayerHealth } from '../player/LocalPlayerHealth';
import { ShotFeedback } from '../effects/ShotFeedback';
import { LocalTrainingRange } from '../weapons/LocalTrainingRange';
import { TrainingTargets } from '../weapons/TrainingTargets';
import { RifleRecoil } from '../weapons/RifleRecoil';
import { RifleMotion } from '../weapons/RifleMotion';
import { LocalLoadout } from '../weapons/LocalLoadout';
import { LocalBubbleFlight } from '../weapons/LocalBubbleFlight';
import type { PrimaryWeaponId } from '@bubble-arena/shared';

/** Replace local training data without replacing the Canvas/HTML portal host. */
export function createTrainingSession(primary: PrimaryWeaponId = 'rifle') {
  const loadout = new LocalLoadout(primary), targets = new TrainingTargets(), playerHealth = new LocalPlayerHealth();
  return {
    range: new LocalTrainingRange(), targets, bubbles: new LocalBubbleFlight(targets, playerHealth.canCauseControl), playerHealth, rescue: new LocalRescuePractice(playerHealth, loadout),
    recoil: new RifleRecoil(), feedback: new ShotFeedback(), motion: new RifleMotion(loadout), loadout,
  };
}
