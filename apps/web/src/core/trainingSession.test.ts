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

test('reset preserves chosen primary but isolates both ammo, projectiles, scope and slowdown', () => {
  const old = createTrainingSession('sniper'); old.loadout.step({ held: true, pressed: true }); old.loadout.setScoped(true); old.loadout.select(2); old.loadout.step({ held: true, pressed: true });
  old.bubbles.flight.spawn(1, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }); old.range.entries[0].target.applySlow();
  const fresh = createTrainingSession(old.loadout.getSnapshot().primary);
  expect(fresh.loadout.getSnapshot()).toMatchObject({ primary: 'sniper', active: 'sniper', scoped: false, ammo: { magazine: 5 } });
  expect(fresh.loadout.getWeaponAmmo('bubble').magazine).toBe(4); expect(fresh.bubbles.flight.getSnapshot()).toEqual([]);
  expect(fresh.range.entries[0].target.getSlowSnapshot()).toBe(1); expect(old.range.entries[0].target.getSlowSnapshot()).toBe(.5);
});
