import { expect, test, vi } from 'vitest';
import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';

test('reset isolates ammo/reload, all target hit histories, floating damage and presentation feedback', () => {
  const old = createTrainingSession();
  old.loadout.step({ held: true, pressed: true });
  old.loadout.step({ held: false, pressed: false }, true);
  old.range.entries.forEach(e => e.target.receiveHit({ sequence: 1, tick: 1 }));
  old.motion.setSpeed(5); old.recoil.kick(1);
  old.feedback.emit({ sequence: 1, muzzle: { x: 1, y: 2, z: 3 }, impact: null });
  expect(old.loadout.getSnapshot().ammo.reloading).toBe(true);
  expect(old.range.getSnapshot().hitCount).toBe(3);
  const fresh = createTrainingSession(), changed = vi.fn();
  const release = fresh.range.subscribe(changed);
  expect(fresh.loadout.getSnapshot().ammo).toMatchObject({ magazine: 30, reserve: 120, shotsFired: 0, reloading: false });
  expect(fresh.loadout.infiniteReserve).toBe(true);
  expect(fresh.loadout.getSnapshot().progress).toBeNull();
  expect(fresh.range.getSnapshot().hitCount).toBe(0);
  for (const e of fresh.range.entries) {
    expect(e.target.getSnapshot()).toMatchObject({ hp: 100, hitCount: 0 });
    expect(e.target.damageNumbers.getSnapshot()).toHaveLength(0);
  }
  expect(fresh.motion.getSnapshot()).toBe(RIFLE_SPREAD_CONFIG.normal);
  expect(fresh.recoil.step(0)).toBe(0);
  expect(fresh.feedback.step(0)).toEqual({ muzzle: null, impact: null });
  old.range.entries[0].target.receiveHit({ sequence: 2, tick: 2 });
  expect(changed).not.toHaveBeenCalled();
  expect(fresh.range.entries[0].target.receiveHit({ sequence: 1, tick: 1 })).toBe(true);
  expect(changed).toHaveBeenCalledTimes(1); release();
});

test('reset preserves held weapon but isolates all ammo, projectiles, scope and slowdown', () => {
  const old = createTrainingSession('sniper'); old.loadout.step({ held: true, pressed: true }); old.loadout.setScoped(true); old.loadout.select(4); old.loadout.step({ held: true, pressed: true });
  old.bubbles.flight.spawn(1, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }); old.range.entries[0].target.applySlow();
  const fresh = createTrainingSession(old.loadout.getSnapshot().active);
  expect(fresh.loadout.getSnapshot()).toMatchObject({ active: 'bubble', scoped: false, ammo: { magazine: 4 } });
  expect(fresh.loadout.getWeaponAmmo('bubble').magazine).toBe(4); expect(fresh.bubbles.flight.getSnapshot()).toEqual([]);
  expect(fresh.range.entries[0].target.getSlowSnapshot()).toBe(1); expect(old.range.entries[0].target.getSlowSnapshot()).toBe(.5);
});

test('reset isolates downed health, queued damage and subscribers while preserving held weapon', () => {
  const old = createTrainingSession('shotgun'); old.playerHealth.requestTest('down'); old.playerHealth.step();
  expect(old.playerHealth.getSnapshot().status).toBe('downed');
  const fresh = createTrainingSession(old.loadout.getSnapshot().active), notify = vi.fn(), release = fresh.playerHealth.subscribe(notify);
  expect(fresh.playerHealth.getSnapshot()).toMatchObject({ hp: 100, downedHp: 0, status: 'normal', lifeId: 1, lastDamage: 0 });
  expect(fresh.loadout.getSnapshot()).toMatchObject({ active: 'shotgun', ammo: { magazine: 6 } });
  old.playerHealth.step(); expect(notify).not.toHaveBeenCalled();
  const pending = createTrainingSession(); pending.playerHealth.requestTest('down');
  const another = createTrainingSession(); pending.playerHealth.step();
  expect(another.playerHealth.getSnapshot().hp).toBe(100);
  fresh.playerHealth.requestTest('hit'); fresh.playerHealth.step(); expect(notify).toHaveBeenCalledTimes(1);
  release(); release(); fresh.playerHealth.requestTest('down'); fresh.playerHealth.step(); expect(notify).toHaveBeenCalledTimes(1);
});

test('full restart disposes old authority/input once and resets every per-match state while preserving config and held weapon', async () => {
  const { restartTrainingSession } = await import('./trainingSession');
  const old = createTrainingSession('sniper', { match: true, config: { countdownSeconds: 1, durationSeconds: 300, scoreLimit: 1 } });
  old.match.setSceneReady(true); old.match.requestStart(); for (let i = 0; i <= 60; i++) old.match.step();
  const reset = vi.fn(); old.bindInputReset(reset);
  old.loadout.step({ held: true, pressed: true }); old.loadout.select(4); old.loadout.step({ held: true, pressed: true });
  old.bubbles.flight.spawn(1, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }); old.range.entries[0].target.receiveHit({ sequence: 1, tick: 0 }, 30); old.range.entries[0].target.applySlow();
  old.motion.setSpeed(5); old.recoil.kick(1); old.feedback.emit({ sequence: 1, muzzle: { x: 0, y: 1, z: 0 }, impact: null });
  old.playerHealth.configureTestSource('enemy-a'); old.playerHealth.requestTest('down'); old.playerHealth.step();
  for (let i = 0; i < 15; i++) { old.playerHealth.requestTest('hit'); old.playerHealth.step(); }
  old.match.resolve(old.score.getSnapshot()); expect(old.match.getSnapshot().phase).toBe('finished');
  const fresh = restartTrainingSession(old); old.dispose(); expect(reset).toHaveBeenCalledTimes(1);
  expect(old.match.canPlay()).toBe(false); expect(old.playerHealth.requestTest('hit')).toBe(false); expect(old.loadout.select(1)).toBe(false);
  expect(old.match.requestStart()).toBe(false); expect(old.bubbles.flight.getSnapshot()).toEqual([]); expect(old.range.entries[0].target.damageNumbers.getSnapshot()).toEqual([]);
  expect(fresh.match.getSnapshot()).toMatchObject({ phase: 'waiting', secondsRemaining: 300, result: null, revision: 0 });
  expect(fresh.match.rule.config).toEqual({ countdownSeconds: 1, durationSeconds: 300, scoreLimit: 1 });
  expect(fresh.match.isSceneReady()).toBe(false); expect(fresh.match.requestStart()).toBe(false); expect(fresh.match.getFinalScores()).toBeNull();
  expect(fresh.score.getSnapshot().teams).toEqual({ red: 0, blue: 0 }); expect(fresh.score.getSnapshot().players.every(p => p.eliminations === 0 && p.assists === 0 && p.rescues === 0)).toBe(true);
  expect(fresh.playerHealth.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, lifeId: 1, revision: 0, downedHp: 0 }); expect(fresh.playerHealth.getTestSource()).toBe('unowned'); expect(fresh.playerHealth.canReplayScore()).toBe(false);
  expect(fresh.loadout.getSnapshot()).toMatchObject({ active: 'bubble', scoped: false, rescuing: false, progress: null, cooldownProgress: null, ammo: { magazine: 4, shotsFired: 0 } });
  expect(fresh.loadout.getWeaponAmmo('bubble').magazine).toBe(4); expect(fresh.rescue.getSnapshot().mode).toBe('off'); expect(fresh.respawn.getRevision()).toBe(0);
  for (const entry of fresh.range.entries) { expect(entry.target.getSnapshot()).toMatchObject({ hp: 100, hitCount: 0 }); expect(entry.target.getSlowSnapshot()).toBe(1); expect(entry.target.damageNumbers.getSnapshot()).toEqual([]); }
  expect(fresh.bubbles.flight.getSnapshot()).toEqual([]); expect(fresh.recoil.step(0)).toBe(0); expect(fresh.feedback.step(0)).toEqual({ muzzle: null, impact: null });
});

test('repeated restarts isolate pending damage/ready and subscribers; released input-reset callbacks do not run', async () => {
  const { restartTrainingSession } = await import('./trainingSession');
  let session = createTrainingSession('shotgun', { match: true });
  for (let run = 0; run < 4; run++) {
    session.match.setSceneReady(true); session.match.requestStart(); for (let i = 0; i <= 180; i++) session.match.step();
    session.playerHealth.requestTest('down'); // reset before authority accepts the queued damage
    const old = session, released = vi.fn(), active = vi.fn(); old.bindInputReset(released)(); old.bindInputReset(active);
    session = restartTrainingSession(old); const changed = vi.fn(), release = session.playerHealth.subscribe(changed);
    old.playerHealth.step(); old.match.step(); old.score.step(1000, [], false);
    expect(old.playerHealth.getSnapshot().hp).toBe(100); expect(changed).not.toHaveBeenCalled(); expect(released).not.toHaveBeenCalled(); expect(active).toHaveBeenCalledTimes(1);
    expect(session.match.getSnapshot().phase).toBe('waiting'); expect(session.match.requestStart()).toBe(false); expect(session.loadout.getSnapshot().active).toBe('shotgun'); release();
  }
  session.match.setSceneReady(true); session.match.requestStart();
  const fresh = restartTrainingSession(session); fresh.match.step(); expect(fresh.match.getSnapshot().phase).toBe('waiting');
});
