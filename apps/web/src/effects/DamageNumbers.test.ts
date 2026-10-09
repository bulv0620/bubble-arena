import { expect, test, vi } from 'vitest';
import { DAMAGE_NUMBER_CONFIG, DamageNumbers } from './DamageNumbers';
import { LocalTrainingTarget } from '../weapons/LocalTrainingTarget';

test('each accepted hit survives batched presentation and rejected hits emit nothing', () => {
  const target = new LocalTrainingTarget(), queue = target.damageNumbers;
  const notify = vi.fn(), release = queue.subscribe(notify);
  for (let i = 1; i <= 5; i++) expect(target.receiveHit({ sequence: i, tick: i * 8 })).toBe(true);
  expect(queue.getSnapshot().map(e => [e.id, e.damage])).toEqual([1, 2, 3, 4, 5].map(id => [id, 20]));
  expect(target.receiveHit({ sequence: 6, tick: 48 })).toBe(false);
  expect(target.receiveHit({ sequence: 5, tick: 40 })).toBe(false);
  expect(notify).toHaveBeenCalledTimes(5);
  release(); release(); queue.remove(1); expect(notify).toHaveBeenCalledTimes(5);
});
test('bounded random offsets and immutable stable snapshots, no invalid or duplicate events', () => {
  const queue = new DamageNumbers(), empty = queue.getSnapshot();
  expect(queue.push(1, 20, 0, 0)).toBe(true);
  expect(queue.getSnapshot()[0]).toMatchObject({ x: -DAMAGE_NUMBER_CONFIG.spreadX, y: -DAMAGE_NUMBER_CONFIG.spreadY });
  expect(queue.push(2, 20, 0.999, 0.999)).toBe(true);
  const saved = queue.getSnapshot(); expect(saved).toBe(queue.getSnapshot());
  expect(Object.isFrozen(saved)).toBe(true); expect(Object.isFrozen(saved[0])).toBe(true); expect(empty).toHaveLength(0);
  for (const [id, damage, rx, ry] of [[2, 20, .5, .5], [0, 20, .5, .5], [3, NaN, .5, .5], [3, 0, .5, .5],
    [3, 20, -1, .5], [3, 20, 1, .5], [3, 20, .5, Infinity]]) expect(queue.push(id, damage, rx, ry)).toBe(false);
  expect(queue.getSnapshot()).toBe(saved);
});
test('capacity evicts oldest; animation completion removes only its entry; cleanup preserves deduplication', () => {
  const queue = new DamageNumbers(), notify = vi.fn(); const release = queue.subscribe(notify);
  for (let id = 1; id <= 30; id++) queue.push(id, 20, .5, .5);
  expect(queue.getSnapshot()).toHaveLength(DAMAGE_NUMBER_CONFIG.capacity);
  expect(queue.getSnapshot()[0].id).toBe(19);
  queue.remove(22); expect(queue.getSnapshot().map(e => e.id)).not.toContain(22);
  expect(queue.getSnapshot()).toHaveLength(11);
  const calls = notify.mock.calls.length; queue.remove(22); expect(notify).toHaveBeenCalledTimes(calls);
  queue.clear(); queue.clear(); expect(queue.getSnapshot()).toHaveLength(0);
  expect(queue.push(30, 20)).toBe(false); expect(queue.push(31, 20)).toBe(true);
  release(); const saved = notify.mock.calls.length; queue.clear(); expect(notify).toHaveBeenCalledTimes(saved);
});
