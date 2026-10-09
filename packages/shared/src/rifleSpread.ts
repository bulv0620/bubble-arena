const degree = Math.PI / 180;
/** Physical cone half-angles. Motion penalties select the largest state, not a stack. */
export const RIFLE_SPREAD_CONFIG = Object.freeze({
  normal: .2 * degree, movingMultiplier: 4.5, airborneMultiplier: 7.5, movementSpeedThreshold: .15,
  bloomPerShot: .18 * degree, maxBloom: 1.4 * degree, recoveryDelay: .18, recoveryPerSecond: 2.8 * degree,
  radialPower: 2,
});
