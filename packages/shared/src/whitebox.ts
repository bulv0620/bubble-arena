import { PLAYER_CONFIG } from './player';

export interface WhiteboxSolid {
  id: string;
  kind: 'wall' | 'box' | 'ramp' | 'step';
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotationZ?: number;
}

const movementTestWall: WhiteboxSolid = {
  id: 'north-wall', kind: 'wall',
  position: [1, 1.5, -3], size: [8, 3, 0.5], color: '#8f9eaa',
};

// Prototype solids; mesh and explicit collider share dimensions and rotations.
export const WHITEBOX_SOLIDS: readonly WhiteboxSolid[] = [
  movementTestWall,
  { id: 'west-wall', kind: 'wall', position: [-3.25, 1.5, -1], size: [0.5, 3, 4.5], color: '#8f9eaa' },
  { id: 'small-box', kind: 'box', position: [1.75, 0.75, 1.5], size: [1.5, 1.5, 1.5], color: '#bba27d' },
  { id: 'large-box', kind: 'box', position: [-0.75, 1, 3.5], size: [2, 2, 1.5], color: '#ae9269' },
  { id: 'step-30cm', kind: 'step', position: [3, PLAYER_CONFIG.maxStepHeight / 2, 6], size: [2, PLAYER_CONFIG.maxStepHeight, 1.5], color: '#729eab' },
  {
    id: 'ramp-45deg', kind: 'ramp',
    position: [6, Math.sin(PLAYER_CONFIG.maxSlopeAngle) * 2 - Math.cos(PLAYER_CONFIG.maxSlopeAngle) * 0.1, -0.5],
    size: [4, 0.2, 1.5], rotationZ: PLAYER_CONFIG.maxSlopeAngle, color: '#92b89c',
  },
];

// Initial map dimensions; used by both the visual mesh and Rapier collider.
export const WHITEBOX_CONFIG = {
  groundSize: 80,
  groundThickness: 1,
  groundTopY: 0,
  testCubeSize: 1,
  testCubeStartY: 5,
  playerSpawnXZ: [-2, 0] as [number, number],
  movementTestWall,
};

// Canonical serializable collision data excludes material colors and demonstration bodies.
export const WHITEBOX_COLLISION = {
  schemaVersion: 2,
  ground: {
    size: WHITEBOX_CONFIG.groundSize,
    thickness: WHITEBOX_CONFIG.groundThickness,
    topY: WHITEBOX_CONFIG.groundTopY,
  },
  solids: WHITEBOX_SOLIDS.map(({ id, kind, position, size, rotationZ = 0 }) => ({ id, kind, position, size, rotationZ })),
};

/** Deterministic 64-bit FNV-1a content identity, usable in browser and Node. */
export function whiteboxCollisionHash(data: typeof WHITEBOX_COLLISION) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(JSON.stringify(data))) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

export const WHITEBOX_COLLISION_HASH = whiteboxCollisionHash(WHITEBOX_COLLISION);
