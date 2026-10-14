import { expect, test } from 'vitest';
import { PHYSICS_CONFIG, WEAPON_CONFIGS, WEAPON_IDS, TRAINING_RIFLE_AMMO_POLICY } from '@bubble-arena/shared';
import { playerActionPolicy } from './playerActionPolicy';
import { HorizontalMovement } from './horizontalMovement';
import { WeaponFireState } from './weaponFireState';
const press = { held: true, pressed: true }, idle = { held: false, pressed: false };
const keys = { forward: true, backward: false, left: false, right: true };

test('life policy is immutable, normal preserves weapon speed, downed can only move, inactive states cannot act', () => {
  expect(playerActionPolicy('normal')).toEqual({ canMove: true, canJump: true, canUseWeapons: true, canRescue: true, maximumSpeed: null });
  expect(playerActionPolicy('downed')).toEqual({ canMove: true, canJump: false, canUseWeapons: false, canRescue: false, maximumSpeed: 1 });
  for (const status of ['eliminated', 'respawning'] as const) expect(playerActionPolicy(status)).toEqual({ canMove: false, canJump: false, canUseWeapons: false, canRescue: false, maximumSpeed: 0 });
  expect(Object.isFrozen(playerActionPolicy('downed'))).toBe(true);
  expect(playerActionPolicy('downed')).toBe(playerActionPolicy('downed'));
  expect(() => playerActionPolicy('invalid' as 'normal')).toThrow(TypeError);
});

test.each([0, .35, 1])('downed cap immediately removes running momentum including air control=%s and diagonal travel', control => {
  const movement = new HorizontalMovement();
  for (let tick = 0; tick < 60; tick++) movement.step(keys, 1, .7, 1.1);
  const delta = movement.step(keys, control, .7, .2, 1);
  expect(Math.hypot(delta.x, delta.z) / PHYSICS_CONFIG.timeStep).toBeCloseTo(1);
  for (let tick = 0; tick < 60; tick++) {
    const next = movement.step(keys, control, tick / 60, .2, 1);
    expect(Math.hypot(next.x, next.z) / PHYSICS_CONFIG.timeStep).toBeLessThanOrEqual(1 + 1e-12);
  }
  const stopped = movement.step(keys, 0, 0, 1, 0); expect(Math.hypot(stopped.x, stopped.z)).toBe(0);
});

test('invalid movement caps reject before changing existing velocity', () => {
  const movement = new HorizontalMovement(), reference = new HorizontalMovement();
  for (let tick = 0; tick < 30; tick++) { movement.step(keys); reference.step(keys); }
  for (const cap of [-1, NaN, Infinity]) expect(() => movement.step(keys, 1, 0, 1, cap)).toThrow(RangeError);
  expect(movement.step(keys)).toEqual(reference.step(keys));
});

test.each(WEAPON_IDS)('%s action gate cancels accepted reload, refuses held/pressed fire and R, keeps ammo and advances cooldown', id => {
  const rules = new WeaponFireState(WEAPON_CONFIGS[id], TRAINING_RIFLE_AMMO_POLICY);
  rules.step(press); rules.step(idle, true);
  const before = rules.getState(); expect(before.reloading).toBe(true);
  expect(rules.step(press, true, false)).toBeNull();
  expect(rules.getState()).toEqual({ ...before, reloading: false });
  for (let tick = 0; tick < 200; tick++) expect(rules.step(press, true, false)).toBeNull();
  expect(rules.getState()).toEqual({ ...before, reloading: false });
  expect(rules.getFireCooldown()).toBeNull();
});

test('blocked completion tick cannot refill or consume reserve; invalid gate cannot advance progress', () => {
  const rules = new WeaponFireState(); rules.step(press); rules.step(idle, true);
  for (let tick = 0; tick < 119; tick++) rules.step(idle);
  const before = rules.getState(), progress = rules.getReloadProgress();
  expect(() => rules.step(idle, false, 'yes' as unknown as boolean)).toThrow(TypeError);
  expect(rules.getState()).toBe(before); expect(rules.getReloadProgress()).toBe(progress);
  rules.step(press, true, false);
  expect(rules.getState()).toEqual({ ...before, reloading: false });
  expect(rules.getState().magazine).toBe(29); expect(rules.getState().reserve).toBe(120);
});

test('downed cancels empty automatic reload and never restarts it while blocked', () => {
  const rules = new WeaponFireState(WEAPON_CONFIGS.bubble, TRAINING_RIFLE_AMMO_POLICY);
  for (let shot = 0; shot < 4; shot++) {
    expect(rules.step(press)).not.toBeNull();
    if (shot < 3) for (let tick = 0; tick < 60; tick++) rules.step(idle);
  }
  expect(rules.getState()).toMatchObject({ magazine: 0, reloading: true });
  for (let tick = 0; tick < 300; tick++) rules.step(press, true, false);
  expect(rules.getState()).toMatchObject({ magazine: 0, reloading: false, shotsFired: 4 });
});
