// Shared simulation units: metres, seconds, Y up.
const TICK_RATE = 60;

export const PHYSICS_CONFIG = {
  tickRate: TICK_RATE,
  timeStep: 1 / TICK_RATE,
  gravity: [0, -20, 0] as [number, number, number],
};
