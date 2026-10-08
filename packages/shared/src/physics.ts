// Shared simulation units: metres, seconds, Y up.
const TICK_RATE = 60;

export const PHYSICS_CONFIG = {
  tickRate: TICK_RATE,
  timeStep: 1 / TICK_RATE,
  gravity: [0, -20, 0] as [number, number, number],
};

// Explicit collider coefficients, preserving the original Rapier defaults for
// solids/players and the prototype's ground override. Not movement deceleration.
export const COLLIDER_MATERIALS = {
  ground: { friction: 0.8, restitution: 0 },
  solid: { friction: 0.5, restitution: 0 },
  player: { friction: 0.5, restitution: 0 },
};
