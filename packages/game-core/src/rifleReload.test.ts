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

test('reload progress follows processed simulation ticks, repeated requests cannot reset it', () => {
  const rule = new RifleFireState();
  expect(rule.getReloadProgress()).toBeNull(); rule.step(idle, true); expect(rule.getReloadProgress()).toBeNull();
  rule.step(hold); rule.step(idle, true); expect(rule.getReloadProgress()).toBe(0);
  for (let i = 1; i <= 60; i++) { rule.step(hold, true); expect(rule.getReloadProgress()).toBeCloseTo(i / 120, 12); }
  const half = rule.getReloadProgress();
  expect(() => rule.step(null as unknown as typeof idle)).toThrow(TypeError); expect(rule.getReloadProgress()).toBe(half);
  for (let i = 61; i < 120; i++) { rule.step(idle); expect(rule.getReloadProgress()).toBeCloseTo(i / 120, 12); }
  rule.step(idle); expect(rule.getReloadProgress()).toBeNull(); expect(rule.getState().reloading).toBe(false);
});

test('last accepted shot starts automatic reload at zero progress even after releasing fire', () => {
  const rule = new RifleFireState({ ...WEAPON_CONFIGS.rifle, magazineSize: 1 }, { autoReload: true, infiniteReserve: true });
  expect(rule.step(hold)).toEqual({ sequence: 1, tick: 0 });
  expect(rule.getState()).toMatchObject({ magazine: 0, reloading: true, shotsFired: 1 });
  expect(rule.getReloadProgress()).toBe(0);
  for (let i = 1; i < 120; i++) { expect(rule.step(idle, true)).toBeNull(); expect(rule.getState().reloading).toBe(true); }
  expect(rule.step(hold, true)).toBeNull();
  expect(rule.getReloadProgress()).toBeNull(); expect(rule.getState().magazine).toBe(1);
  expect(rule.step(hold)).toEqual({ sequence: 2, tick: 121 });
});
test('training can fire and reload beyond all finite reserves, including configured zero reserve', () => {
  const rule = new RifleFireState({ ...WEAPON_CONFIGS.rifle, reserveAmmo: 0 }, { autoReload: true, infiniteReserve: true });
  let reloads = 0, wasReloading = false, lastSequence = 0;
  for (let i = 0; i < 2600; i++) {
    const shot = rule.step(hold);
    if (shot) { expect(shot.sequence).toBe(lastSequence + 1); lastSequence = shot.sequence; }
    const state = rule.getState();
    if (wasReloading && !state.reloading) { reloads++; expect(state.magazine).toBe(30); }
    expect(state.reserve).toBe(0); expect(state.magazine).toBeGreaterThanOrEqual(0);
    wasReloading = state.reloading;
  }
  expect(reloads).toBeGreaterThanOrEqual(6); expect(lastSequence).toBeGreaterThan(180);
});
test('finite automatic reload transfers only available reserve and stops when exhausted', () => {
  const rule = new RifleFireState({ ...WEAPON_CONFIGS.rifle, magazineSize: 1, reserveAmmo: 1 }, { autoReload: true, infiniteReserve: false });
  rule.step(hold); for (let i = 0; i < 120; i++) rule.step(idle);
  expect(rule.getState()).toMatchObject({ magazine: 1, reserve: 0, reloading: false });
  rule.step(hold); for (let i = 0; i < 300; i++) expect(rule.step(hold)).toBeNull();
  expect(rule.getState()).toMatchObject({ magazine: 0, reserve: 0, shotsFired: 2, reloading: false });
});
test('infinite reserve supports early manual reload; policy is validated and copied', () => {
  const policy = { autoReload: true, infiniteReserve: true };
  const rule = new RifleFireState({ ...WEAPON_CONFIGS.rifle, reserveAmmo: 0 }, policy);
  policy.infiniteReserve = false; policy.autoReload = false;
  rule.step(hold); rule.step(idle, true);
  for (let i = 0; i < 120; i++) rule.step(idle);
  expect(rule.getState()).toMatchObject({ magazine: 30, reserve: 0, reloading: false });
  for (const invalid of [null, {}, { autoReload: 1, infiniteReserve: true }, { autoReload: true, infiniteReserve: true, extra: 1 }]) {
    expect(() => new RifleFireState(WEAPON_CONFIGS.rifle, invalid as unknown as typeof policy)).toThrow(TypeError);
  }
});
