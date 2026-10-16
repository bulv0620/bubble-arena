import { expect, test } from 'vitest';
import { BLOCK_AVATAR_CONFIG as avatar } from './blockAvatar';
import { PLAYER_CONFIG as player } from './player';
import { ARENA_SPAWNS } from './arena';
import { TRAINING_TARGET_LAYOUT } from './trainingTarget';

test('short avatar visual and damage regions fit the shared movement capsule and stand on the same floor', () => {
  expect(avatar.headRadius * 2 / player.height).toBeCloseTo(.5);
  expect(avatar.headY + avatar.headRadius).toBeCloseTo(player.height / 2);
  expect(avatar.bodyY - avatar.bodyHalfHeight - avatar.bodyRadius).toBeCloseTo(-player.height / 2);
  expect(avatar.headY - avatar.headRadius).toBeCloseTo(avatar.bodyY + avatar.bodyHalfHeight + avatar.bodyRadius);
  expect(avatar.bodyHalfHeight).toBeGreaterThan(0);
  expect(avatar.headRadius).toBeLessThanOrEqual(player.radius);
  expect(avatar.bodyRadius).toBeLessThanOrEqual(player.radius);
  expect((player.capsuleHalfHeight + player.radius) * 2).toBe(player.height);
  for (const point of ARENA_SPAWNS.points) expect(point.position.y - player.height / 2).toBeCloseTo(player.spawnClearance);
  for (const entry of TRAINING_TARGET_LAYOUT) expect(entry.position[1] - player.height / 2).toBeCloseTo(0);
});
