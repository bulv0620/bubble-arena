import { expect, test, vi } from 'vitest';
import { LocalPlayerHealth } from './LocalPlayerHealth';

test('UI requests are bounded intents: no damage until the next simulation step, with one notification per accepted hit', () => {
  const player = new LocalPlayerHealth(), notify = vi.fn(), release = player.subscribe(notify), initial = player.getSnapshot();
  expect(player.requestTest('hit')).toBe(true); expect(player.requestTest('down')).toBe(false);
  expect(player.getSnapshot()).toBe(initial); expect(notify).not.toHaveBeenCalled();
  expect(player.step()).toBe(true); expect(player.getSnapshot().hp).toBe(80); expect(notify).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 60; i++) expect(player.step()).toBe(false);
  expect(notify).toHaveBeenCalledTimes(1);
  player.requestTest('down'); player.step();
  const downed = player.getSnapshot(); expect(downed).toMatchObject({ hp: 0, status: 'downed', downedHp: 50, lifeId: 1, lastDamage: 80 });
  expect(notify).toHaveBeenCalledTimes(2);
  expect(player.requestTest('down')).toBe(false);
  for (let i = 0; i < 1800; i++) player.step();
  expect(player.getSnapshot()).toMatchObject({ status: 'respawning', eliminationReason: 'downed-timeout', revision: 3 }); expect(notify).toHaveBeenCalledTimes(27);
  release(); release();
});
test('pending input cleanup and subscription release are idempotent, and a rebound subscriber works', () => {
  const player = new LocalPlayerHealth(), stale = vi.fn(), release = player.subscribe(stale);
  player.requestTest('down'); player.clearPending(); player.clearPending();
  expect(player.step()).toBe(false); expect(player.getSnapshot().hp).toBe(100);
  release(); release(); const fresh = vi.fn(), unFresh = player.subscribe(fresh);
  player.requestTest('hit'); player.step();
  expect(stale).not.toHaveBeenCalled(); expect(fresh).toHaveBeenCalledTimes(1);
  expect(() => player.requestTest('bad' as 'hit')).toThrow(TypeError);
  unFresh();
});
