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

test('whole local elimination resolves score limit once and captures frozen result before respawn', () => {
  const s = createTrainingSession('rifle', { match: true, config: { countdownSeconds: 1, durationSeconds: 300, scoreLimit: 1 } });
  s.match.setSceneReady(true); s.match.requestStart(); for (let i = 0; i <= 60; i++) s.match.step();
  const frame = () => { s.match.step(); s.playerHealth.step(); s.match.resolve(s.score.getSnapshot()); };
  s.playerHealth.configureTestSource('enemy-a'); s.playerHealth.requestTest('down'); frame(); expect(s.match.getSnapshot().phase).toBe('playing');
  s.playerHealth.configureTestSource('enemy-b'); for (let i = 0; i < 3; i++) { s.playerHealth.requestTest('hit'); frame(); }
  expect(s.match.getSnapshot()).toMatchObject({ phase: 'finished', result: { winner: 'blue', reason: 'score-limit', teams: { red: 0, blue: 1 } } });
  const final = s.match.getFinalScores(); expect(final?.players.find(p => p.playerId === 'training-enemy-a')?.assists).toBe(1);
  expect(final?.players.find(p => p.playerId === 'training-enemy-b')?.eliminations).toBe(1);
  for (let i = 0; i < 360; i++) frame(); expect(s.playerHealth.getSnapshot().status).toBe('eliminated'); expect(s.match.getFinalScores()).toBe(final);
  expect(s.match.configure({ countdownSeconds: 1, durationSeconds: 15, scoreLimit: 20 })).toBe(false);
});
test('time test uses fixed clock while settings-style idle has no input, draw freezes an ongoing downed deadline', () => {
  const s = createTrainingSession('rifle', { match: true, config: { countdownSeconds: 1, durationSeconds: 1, scoreLimit: 20 } });
  s.match.setSceneReady(true); s.match.requestStart(); for (let i = 0; i <= 60; i++) s.match.step();
  s.playerHealth.requestTest('down'); s.playerHealth.step();
  for (let i = 0; i < 60; i++) { s.match.step(); s.playerHealth.step(); s.match.resolve(s.score.getSnapshot()); }
  expect(s.match.getSnapshot().result).toMatchObject({ winner: null, reason: 'time-limit' });
  const life = s.playerHealth.getSnapshot(); for (let i = 0; i < 1500; i++) s.playerHealth.step(); expect(s.playerHealth.getSnapshot()).toBe(life);
});
