import { expect, test } from 'vitest';
import { TrainingTargetState, type TrainingHit } from './trainingTargetState';
test('independent target displays 100HP, hit boundary records once without 3.9 damage', () => {
  const target = new TrainingTargetState(), other = new TrainingTargetState(), initial = target.getState();
  expect(initial).toEqual({ hp: 100, maxHp: 100, hitCount: 0, lastHitTick: null });
  expect(target.receiveHit({ tick: 10, sequence: 1 })).toBe(true);
  expect(target.getState()).toEqual({ hp: 100, maxHp: 100, hitCount: 1, lastHitTick: 10 });
  expect(target.receiveHit({ tick: 10, sequence: 1 })).toBe(false);
  expect(target.receiveHit({ tick: 9, sequence: 2 })).toBe(false);
  expect(target.receiveHit({ tick: 18, sequence: 2 })).toBe(true);
  expect(initial.hitCount).toBe(0); expect(other.getState()).toEqual(initial);
  expect(Object.isFrozen(target.getState())).toBe(true);
});
test('invalid HP and shot metadata reject before mutation', () => {
  for (const hp of [0, -1, NaN, Infinity, 1.5]) expect(() => new TrainingTargetState(hp)).toThrow(RangeError);
  expect(new TrainingTargetState(50).getState().maxHp).toBe(50);
  const target = new TrainingTargetState(), before = target.getState();
  for (const bad of [null, {}, { tick: -1, sequence: 1 }, { tick: 0, sequence: 0 }, { tick: 0, sequence: '1' }, { tick: Infinity, sequence: 1 }]) {
    expect(() => target.receiveHit(bad as TrainingHit)).toThrow(TypeError);
  }
  expect(target.getState()).toBe(before);
});
