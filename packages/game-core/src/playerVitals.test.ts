import { expect, test } from 'vitest';
import { createPlayerVitals } from './playerVitals';
import { TrainingTargetState } from './trainingTargetState';
test('initial own health is independent from damage to training target', () => {
  const own = createPlayerVitals(), target = new TrainingTargetState();
  target.receiveHit({ tick: 0, sequence: 1 });
  expect(own).toEqual({ hp: 100, maxHp: 100 }); expect(Object.isFrozen(own)).toBe(true);
  expect(target.getState().hp).toBe(80); expect(createPlayerVitals(50).hp).toBe(50);
  for (const bad of [0, -1, NaN, Infinity, 1.5]) expect(() => createPlayerVitals(bad)).toThrow(RangeError);
});
