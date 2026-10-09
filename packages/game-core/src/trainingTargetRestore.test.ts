import { expect, test } from 'vitest';
import { TrainingTargetState } from './trainingTargetState';

test('restore is exactly 120 fixed steps after depletion, extra hits do not restart it', () => {
  const target = new TrainingTargetState(20), initial = target.getState();
  expect(target.step()).toBe(false); expect(target.getState()).toBe(initial);
  target.receiveHit({ sequence: 1, tick: 0 }); const empty = target.getState();
  for (let i = 1; i < 120; i++) {
    expect(target.receiveHit({ sequence: i + 1, tick: i })).toBe(false);
    expect(target.step()).toBe(false); expect(target.getState()).toBe(empty);
  }
  expect(target.step()).toBe(true); expect(target.getState()).toMatchObject({ hp: 20, hitCount: 1, lastDamage: 0 });
  expect(target.receiveHit({ sequence: 120, tick: 119 })).toBe(false);
  expect(target.receiveHit({ sequence: 121, tick: 118 })).toBe(false);
  expect(target.receiveHit({ sequence: 121, tick: 120 })).toBe(true);
  for (let i = 1; i <= 120; i++) expect(target.step()).toBe(i === 120);
  expect(target.getState()).toMatchObject({ hp: 20, hitCount: 2 }); expect(empty.hp).toBe(0);
});
test('targets restore independently and duration rounds upward without changing current HP', () => {
  const left = new TrainingTargetState(20), right = new TrainingTargetState(20);
  left.receiveHit({ sequence: 1, tick: 0 });
  for (let i = 0; i < 60; i++) { left.step(); right.step(); }
  right.receiveHit({ sequence: 2, tick: 60 });
  for (let i = 0; i < 60; i++) { left.step(); right.step(); }
  expect(left.getState().hp).toBe(20); expect(right.getState().hp).toBe(0);
  for (let i = 0; i < 60; i++) right.step(); expect(right.getState().hp).toBe(20);
  const short = new TrainingTargetState(20, 20, 0.025); short.receiveHit({ sequence: 1, tick: 0 });
  expect(short.step()).toBe(false); expect(short.step()).toBe(true);
  for (const duration of [0, -1, NaN, Infinity, Number.MAX_VALUE]) expect(() => new TrainingTargetState(20, 20, duration)).toThrow(RangeError);
});
