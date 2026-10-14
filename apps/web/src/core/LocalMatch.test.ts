import { expect, test, vi } from 'vitest';
import { createTrainingSession } from './trainingSession';

test('loading/start are intents consumed by physics, gameplay gates release only after countdown', () => {
  const s = createTrainingSession('sniper', { match: true }), m = s.match;
  expect(m.requestStart()).toBe(false); expect(m.canPlay()).toBe(false);
  expect(s.playerHealth.requestTest('down')).toBe(false);
  expect(s.loadout.step({ held: true, pressed: true })).toBeNull();
  expect(s.loadout.select(2)).toBe(false); expect(s.loadout.getSpeed()).toBe(0);
  m.setSceneReady(true); m.requestStart(); expect(m.getSnapshot().phase).toBe('waiting');
  m.step(); for (let i = 0; i < 179; i++) m.step();
  expect(m.getSnapshot().phase).toBe('countdown'); m.step(); expect(m.canPlay()).toBe(true);
  expect(s.loadout.step({ held: true, pressed: true })).not.toBeNull();
  expect(s.playerHealth.requestTest('hit')).toBe(true); s.playerHealth.step(); expect(s.playerHealth.getSnapshot().hp).toBe(80);
});
test('finished freezes health deadlines, spawn, queued hits, ammo and control', () => {
  const s = createTrainingSession('rifle', { match: true }), m = s.match;
  m.setSceneReady(true); m.requestStart(); for (let i = 0; i <= 180; i++) m.step();
  s.playerHealth.requestTest('down'); s.playerHealth.step();
  s.playerHealth.requestTest('hit');
  m.rule.finish(180);
  const life = s.playerHealth.getSnapshot(), ammo = s.loadout.getSnapshot();
  for (let i = 0; i < 1500; i++) { m.step(); s.playerHealth.step(); s.loadout.step({ held: true, pressed: true }, true); }
  expect(s.playerHealth.getSnapshot()).toBe(life); expect(s.loadout.getSnapshot()).toBe(ammo);
  expect(s.playerHealth.canCauseControl()).toBe(false);
  const spawn = vi.fn(); expect(s.playerHealth.completeSpawn(spawn)).toBe(false); expect(spawn).not.toHaveBeenCalled();
});
test('subscriptions release and unloading cancels the queued ready intent', () => {
  const m = createTrainingSession('rifle', { match: true }).match, notify = vi.fn();
  const release = m.subscribe(notify); m.setSceneReady(true); expect(notify).toHaveBeenCalledTimes(1);
  m.requestStart(); m.setSceneReady(false); m.step(); expect(m.getSnapshot().phase).toBe('waiting');
  release(); release(); m.setSceneReady(true); m.requestStart(); m.step(); expect(notify).toHaveBeenCalledTimes(2);
});
