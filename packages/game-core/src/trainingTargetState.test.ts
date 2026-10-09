import { expect, test } from 'vitest';
import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import { TrainingTargetState, type TrainingHit } from './trainingTargetState';
test('valid unique hits apply shared rifle damage to immutable independent snapshots', () => {
  const target = new TrainingTargetState(), other = new TrainingTargetState(), initial = target.getState();
  expect(initial).toEqual({ hp: 100, maxHp: 100, hitCount: 0, lastHitTick: null, lastDamage: 0 });
  expect(target.receiveHit({ tick: 10, sequence: 1 })).toBe(true);
  expect(target.getState()).toEqual({ hp: 100 - WEAPON_CONFIGS.rifle.damage, maxHp: 100, hitCount: 1, lastHitTick: 10, lastDamage: WEAPON_CONFIGS.rifle.damage });
  const once = target.getState();
  expect(target.receiveHit({ tick: 10, sequence: 1 })).toBe(false);
  expect(target.receiveHit({ tick: 9, sequence: 2 })).toBe(false);
  expect(target.getState()).toBe(once);
  expect(target.receiveHit({ tick: 18, sequence: 2 })).toBe(true);
  expect(target.getState().hp).toBe(60);
  expect(initial.hitCount).toBe(0); expect(other.getState()).toEqual(initial);
  expect(Object.isFrozen(target.getState())).toBe(true);
});
test('damage clamps to remaining HP; exhausted fixture produces no further hit or feedback', () => {
  const target = new TrainingTargetState(25);
  target.receiveHit({ tick: 0, sequence: 1 });
  expect(target.getState()).toMatchObject({ hp: 5, lastDamage: 20 });
  target.receiveHit({ tick: 8, sequence: 2 });
  expect(target.getState()).toMatchObject({ hp: 0, lastDamage: 5, hitCount: 2 });
  const dead = target.getState();
  for (let sequence = 3; sequence < 20; sequence++) expect(target.receiveHit({ tick: sequence * 8, sequence })).toBe(false);
  expect(target.getState()).toBe(dead);
  const decimal = new TrainingTargetState(1, 0.5);
  decimal.receiveHit({ tick: 0, sequence: 1 }); expect(decimal.getState().hp).toBe(0.5);
});
test('invalid HP, damage and shot metadata reject before mutation', () => {
  for (const hp of [0, -1, NaN, Infinity, 1.5]) expect(() => new TrainingTargetState(hp)).toThrow(RangeError);
  for (const damage of [0, -1, NaN, Infinity]) expect(() => new TrainingTargetState(100, damage)).toThrow(RangeError);
  expect(new TrainingTargetState(50).getState().maxHp).toBe(50);
  const target = new TrainingTargetState(), before = target.getState();
  for (const bad of [null, {}, { tick: -1, sequence: 1 }, { tick: 0, sequence: 0 }, { tick: 0, sequence: '1' }, { tick: Infinity, sequence: 1 }]) {
    expect(() => target.receiveHit(bad as TrainingHit)).toThrow(TypeError);
  }
  expect(target.getState()).toBe(before);
});
