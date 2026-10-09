// Rapier membership in the high 16 bits, filter in the low 16 bits.
// Players interact with the static map only; the demonstration cube also only hits the map.
export const COLLISION_GROUPS = {
  map: (1 << 16) | 2 | 4,
  player: (2 << 16) | 1,
  trainingTarget: (8 << 16) | 16,
  targetQuery: (16 << 16) | 8,
  projectileQuery: ((2 | 16) << 16) | 1 | 8,
  testCube: (4 << 16) | 1,
};
