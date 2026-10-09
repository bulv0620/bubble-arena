import { expect, test, vi } from 'vitest';
import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';

test('reset isolates ammo/reload, all target hit histories, floating damage and presentation feedback', () => {
  const old = createTrainingSession();
  old.rifle.step({ held: true, pressed: true });
  old.rifle.step({ held: false, pressed: false }, true);
  old.range.entries.forEach(e => e.target.receiveHit({ sequence: 1, tick: 1 }));
  old.motion.setSpeed(5); old.recoil.kick(1);
  old.feedback.emit({ sequence: 1, muzzle: { x: 1, y: 2, z: 3 }, impact: null });
  expect(old.rifle.getSnapshot().reloading).toBe(true);
  expect(old.range.getSnapshot().hitCount).toBe(3);
  const fresh = createTrainingSession(), changed = vi.fn();
  const release = fresh.range.subscribe(changed);
  expect(fresh.rifle.getSnapshot()).toMatchObject({ magazine: 30, reserve: 120, shotsFired: 0, reloading: false });
  expect(fresh.rifle.getReloadProgress()).toBeNull();
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
