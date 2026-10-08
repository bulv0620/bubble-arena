// Initial map dimensions; used by both the visual mesh and Rapier collider.
export const WHITEBOX_CONFIG = {
  groundSize: 80,
  groundThickness: 1,
  groundTopY: 0,
  testCubeSize: 1,
  testCubeStartY: 5,
  playerSpawnXZ: [-2, 0] as [number, number],
  movementTestWall: {
    position: [1, 1.5, -3] as [number, number, number],
    size: [8, 3, 0.5] as [number, number, number],
  },
};
