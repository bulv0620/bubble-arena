import { expect, test } from 'vitest';
import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import { RifleFireState } from './rifleFireState';
const idle = { held: false, pressed: false }, hold = { held: true, pressed: false };
test('reload takes exactly 120 ticks; request wins over fire, repeated R/fire cannot interrupt or restart', () => {
  const rule = new RifleFireState(); rule.step(hold);
  const before = rule.getState();
  expect(rule.step(hold, true)).toBeNull();
  expect(rule.getState()).toMatchObject({ magazine: 29, reserve: 120, reloading: true });
  const active = rule.getState();
  for (let i = 0; i < 119; i++) { expect(rule.step(hold, true)).toBeNull(); expect(rule.getState()).toBe(active); }
  expect(rule.step(hold, true)).toBeNull();
  expect(rule.getState()).toMatchObject({ magazine: 30, reserve: 119, reloading: false, shotsFired: 1 });
  expect(before.reloading).toBe(false); expect(Object.isFrozen(rule.getState())).toBe(true);
  expect(rule.step(hold)?.sequence).toBe(2);
  for (let i = 0; i < 7; i++) expect(rule.step(hold)).toBeNull();
  expect(rule.step(hold)?.sequence).toBe(3);
});
test('finite reserve transfers only missing ammo; zero reserve/full magazine cannot reload', () => {
  const rule = new RifleFireState({ ...WEAPON_CONFIGS.rifle, magazineSize: 3, reserveAmmo: 2 });
  const full = rule.getState(); rule.step(idle, true); expect(rule.getState()).toBe(full);
  for (let i = 0; i < 60; i++) rule.step(hold);
  rule.step(idle, true);
  for (let i = 0; i < 120; i++) rule.step(idle);
  expect(rule.getState()).toMatchObject({ magazine: 2, reserve: 0, reloading: false });
  const noReserve = rule.getState(); rule.step(idle, true); expect(rule.getState()).toBe(noReserve);
  for (let i = 0; i < 60; i++) rule.step(hold);
  rule.step(hold, true); expect(rule.getState()).toMatchObject({ magazine: 0, reserve: 0, reloading: false });
});
test('clearing input does not cancel accepted reload; short fire presses during reload are not buffered', () => {
  const rule = new RifleFireState(); rule.step(hold); rule.step(idle, true);
  rule.step({ held: false, pressed: true });
  for (let i = 0; i < 200; i++) expect(rule.step(idle)).toBeNull();
  expect(rule.getState()).toMatchObject({ magazine: 30, reserve: 119, shotsFired: 1, reloading: false });
});
test('fractional reload duration rounds up and invalid duration/intent rejects before mutation', () => {
  const rule = new RifleFireState({ ...WEAPON_CONFIGS.rifle, reloadDuration: 0.025 });
  expect(() => rule.step(hold, 1 as unknown as boolean)).toThrow(TypeError);
  expect(rule.step(hold)?.tick).toBe(0); rule.step(idle, true);
  rule.step(idle); expect(rule.getState().reloading).toBe(true);
  rule.step(idle); expect(rule.getState().reloading).toBe(false);
  expect(() => new RifleFireState({ ...WEAPON_CONFIGS.rifle, reloadDuration: Number.MAX_VALUE })).toThrow(RangeError);
});
