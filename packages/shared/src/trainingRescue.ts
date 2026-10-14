export const TRAINING_RESCUE_MODES = Object.freeze(['off', 'stationary', 'crawl-away', 'injury'] as const);
export type TrainingRescueMode = typeof TRAINING_RESCUE_MODES[number];
export const TRAINING_RESCUE_CONFIG = Object.freeze({ playerId: 'training-player', allyId: 'training-ally',
  offsetX: .8, offsetZ: -1, crawlSpeed: 1, injuryAfterTicks: 60 });
