import { expect, test, vi } from 'vitest';
import { LocalTrainingRange } from './LocalTrainingRange';

test('restore notifies once, clears old numbers without replaying hit markers, and preserves cumulative hits', () => {
  const range = new LocalTrainingRange(), target = range.entries[0].target;
  const notify = vi.fn(), release = range.subscribe(notify);
  for (let sequence = 1; sequence <= 5; sequence++) target.receiveHit({ sequence, tick: sequence * 8 });
  const depleted = range.getSnapshot(); expect(depleted.hitCount).toBe(5); expect(target.damageNumbers.getSnapshot()).toHaveLength(5);
  for (let i = 1; i < 120; i++) { target.step(); expect(range.getSnapshot()).toBe(depleted); }
  expect(notify).toHaveBeenCalledTimes(5); expect(target.step()).toBe(true);
  expect(range.getSnapshot().targets.map(t => t.hp)).toEqual([100, 100, 100]);
  expect(range.getSnapshot().hitCount).toBe(5); expect(target.damageNumbers.getSnapshot()).toHaveLength(0);
  expect(notify).toHaveBeenCalledTimes(6);
  expect(target.receiveHit({ sequence: 5, tick: 40 })).toBe(false);
  expect(target.receiveHit({ sequence: 6, tick: 160 })).toBe(true);
  expect(target.damageNumbers.getSnapshot().map(e => e.id)).toEqual([6]);
  release(); release(); const count = notify.mock.calls.length;
  target.receiveHit({ sequence: 7, tick: 168 }); expect(notify).toHaveBeenCalledTimes(count);
});
