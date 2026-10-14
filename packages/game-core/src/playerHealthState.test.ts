import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG } from '@bubble-arena/shared';
import { PlayerHealthState } from './playerHealthState';

const hit = (sequence = 1, tick = 0, lifeId = 1) => ({ sequence, tick, lifeId });
test('standing damage updates frozen snapshots and five rifle body hits enter downed without a new life', () => {
  const player = new PlayerHealthState();
  expect(player.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, downedHp: 0, lifeId: 1 });
  for (let sequence = 1; sequence <= 5; sequence++) {
    expect(player.receiveDamage(hit(sequence, sequence), 20, false)).toBe(true);
    const state = player.getSnapshot();
    expect(state.hp).toBe(100 - 20 * sequence); expect(state.lastDamage).toBe(20); expect(Object.isFrozen(state)).toBe(true);
    expect(state.status).toBe(sequence === 5 ? 'downed' : 'normal');
  }
  expect(player.getSnapshot()).toMatchObject({ hp: 0, downedHp: 50, maxDownedHp: 50, status: 'downed', lifeId: 1, revision: 1 });
});
test('overkill is clipped to standing health and cannot spill into the independent downed pool', () => {
  const player = new PlayerHealthState();
  player.receiveDamage(hit(), 160, false);
  const downed = player.getSnapshot();
  expect(downed).toMatchObject({ hp: 0, downedHp: 50, lastDamage: 100, status: 'downed' });
  // Only a distinct subsequent hit can finish; replay of the standing hit cannot spill.
  expect(player.receiveDamage(hit(), 999, false)).toBe(false); expect(player.getSnapshot()).toBe(downed);
  expect(player.receiveDamage(hit(2, 1), 999, false)).toBe(true);
  expect(player.getSnapshot()).toMatchObject({ status: 'eliminated', hp: 0, downedHp: 0, lastDamage: 50 });
  const eliminated = player.getSnapshot();
  for (let sequence = 3; sequence < 100; sequence++) expect(player.receiveDamage(hit(sequence, sequence), 999, false)).toBe(false);
  expect(player.getSnapshot()).toBe(eliminated);
});
test('duplicate, out-of-order and wrong-life damage cannot mutate health or poison a later valid identity', () => {
  const player = new PlayerHealthState(); player.receiveDamage(hit(2, 10), 20, false);
  const saved = player.getSnapshot();
  for (const bad of [hit(2, 10), hit(1, 11), hit(3, 9), hit(99, 99, 2)]) {
    expect(player.receiveDamage(bad, 20, false)).toBe(false); expect(player.getSnapshot()).toBe(saved);
  }
  expect(player.receiveDamage(hit(3, 10), 20, false)).toBe(true); expect(player.getSnapshot().hp).toBe(60);
});
test('finished blocks damage; invalid identities, damage and gates fail before mutation', () => {
  const player = new PlayerHealthState(), saved = player.getSnapshot();
  expect(player.receiveDamage(hit(), 100, true)).toBe(false); expect(player.getSnapshot()).toBe(saved);
  for (const damage of [0, -1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => player.receiveDamage(hit(), damage, false)).toThrow(RangeError);
  for (const identity of [hit(0), hit(1, -1), hit(1, 0, 0), hit(1.5), hit(1, NaN)]) expect(() => player.receiveDamage(identity, 20, false)).toThrow(RangeError);
  expect(() => player.receiveDamage(hit(), 20, undefined as unknown as boolean)).toThrow(TypeError);
  const accessor = Object.defineProperty(hit(), 'tick', { get: () => { throw new Error('must not read'); } });
  expect(() => player.receiveDamage(accessor, 20, false)).toThrow(TypeError);
  expect(() => player.receiveDamage({ ...hit(), extra: 1 } as ReturnType<typeof hit>, 20, false)).toThrow(TypeError);
  expect(player.getSnapshot()).toBe(saved);
  expect(player.receiveDamage(hit(), 20, false)).toBe(true);
});
test('configured downed HP and life identity are independent across instances', () => {
  const config = { ...PLAYER_LIFE_CONFIG, downedHp: 75 }, a = new PlayerHealthState(7, config), b = new PlayerHealthState();
  config.downedHp = 99;
  expect(a.receiveDamage(hit(1, 0, 7), 100, false)).toBe(true);
  expect(a.getSnapshot()).toMatchObject({ status: 'downed', hp: 0, downedHp: 75, lifeId: 7 });
  expect(b.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, downedHp: 0, lifeId: 1 });
});
