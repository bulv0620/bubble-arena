import { expect, test } from 'vitest';
import { WHITEBOX_COLLISION, WHITEBOX_COLLISION_HASH, WHITEBOX_CONFIG, WHITEBOX_SOLIDS, whiteboxCollisionHash } from './whitebox';

test('whitebox declarations have unique IDs, positive finite dimensions and rest on the ground', () => {
  expect(new Set(WHITEBOX_SOLIDS.map((solid) => solid.id)).size).toBe(WHITEBOX_SOLIDS.length);
  expect(WHITEBOX_SOLIDS.filter((solid) => solid.kind === 'wall')).toHaveLength(2);
  expect(WHITEBOX_SOLIDS.filter((solid) => solid.kind === 'box')).toHaveLength(2);
  for (const solid of WHITEBOX_SOLIDS) {
    expect(solid.size.every((dimension) => Number.isFinite(dimension) && dimension > 0)).toBe(true);
    expect(solid.position.every(Number.isFinite)).toBe(true);
    expect(solid.position[1] - solid.size[1] / 2).toBe(WHITEBOX_CONFIG.groundTopY);
  }
});

test('collision identity survives JSON transfer and changes with geometry or schema changes', () => {
  const received = JSON.parse(JSON.stringify(WHITEBOX_COLLISION)) as typeof WHITEBOX_COLLISION;
  expect(whiteboxCollisionHash(received)).toBe(WHITEBOX_COLLISION_HASH);
  received.solids[0].size[0] += 0.1;
  expect(whiteboxCollisionHash(received)).not.toBe(WHITEBOX_COLLISION_HASH);
  const groundChanged = structuredClone(WHITEBOX_COLLISION);
  groundChanged.ground.topY += 1;
  expect(whiteboxCollisionHash(groundChanged)).not.toBe(WHITEBOX_COLLISION_HASH);
  const schemaChanged = structuredClone(WHITEBOX_COLLISION);
  schemaChanged.schemaVersion += 1;
  expect(whiteboxCollisionHash(schemaChanged)).not.toBe(WHITEBOX_COLLISION_HASH);
  expect(JSON.stringify(WHITEBOX_COLLISION)).not.toContain('color');
});
