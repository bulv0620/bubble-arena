import { TRAINING_RIFLE_AMMO_POLICY } from '@bubble-arena/shared';
import { createPlayerVitals } from '@bubble-arena/game-core';
import { ShotFeedback } from '../effects/ShotFeedback';
import { LocalTrainingRange } from '../weapons/LocalTrainingRange';
import { TrainingTargets } from '../weapons/TrainingTargets';
import { RifleRecoil } from '../weapons/RifleRecoil';
import { RifleMotion } from '../weapons/RifleMotion';
import { LocalRifle } from '../weapons/LocalRifle';

/** Replace local training data without replacing the Canvas/HTML portal host. */
export function createTrainingSession() {
  return {
    range: new LocalTrainingRange(), targets: new TrainingTargets(), playerVitals: createPlayerVitals(),
    recoil: new RifleRecoil(), feedback: new ShotFeedback(), motion: new RifleMotion(), rifle: new LocalRifle(TRAINING_RIFLE_AMMO_POLICY),
  };
}
