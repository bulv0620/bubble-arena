import { parseDamageActor, parseScoreRoster } from './scoring';
import { TRAINING_RESCUE_CONFIG } from './trainingRescue';
export const TRAINING_DAMAGE_SOURCES = Object.freeze(['unowned', 'enemy-a', 'enemy-b'] as const);
export type TrainingDamageSource = typeof TRAINING_DAMAGE_SOURCES[number];
export const TRAINING_SCORE_ACTORS = Object.freeze({
  player: parseDamageActor({ playerId: TRAINING_RESCUE_CONFIG.playerId, teamId: 'red' }),
  ally: parseDamageActor({ playerId: TRAINING_RESCUE_CONFIG.allyId, teamId: 'red' }),
  'enemy-a': parseDamageActor({ playerId: 'training-enemy-a', teamId: 'blue' }),
  'enemy-b': parseDamageActor({ playerId: 'training-enemy-b', teamId: 'blue' }),
});
export const TRAINING_SCORE_ROSTER = parseScoreRoster(Object.values(TRAINING_SCORE_ACTORS).map(p => ({ ...p, lifeId: 1 })));
