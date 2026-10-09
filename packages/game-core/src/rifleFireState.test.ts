import { expect, test } from 'vitest';
import { PHYSICS_CONFIG, WEAPON_CONFIGS, type FireIntent } from '@bubble-arena/shared';
import { RifleFireState } from './rifleFireState';

const idle: FireIntent = { held: false, pressed: false }, hold: FireIntent = { held: true, pressed: false };
test('rifle starts at 30/120; each accepted shot deducts exactly one and preserves immutable snapshots', () => {
  const rule = new RifleFireState(), before = rule.getState();
  expect(before).toEqual({ magazine: 30, reserve: 120, reloading: false, shotsFired: 0 });
  expect(rule.step(idle)).toBeNull(); expect(rule.getState()).toBe(before);
  expect(rule.step({ held: false, pressed: true })).toEqual({ tick: 1, sequence: 1 });
  expect(rule.getState()).toEqual({ magazine: 29, reserve: 120, reloading: false, shotsFired: 1 });
  expect(before.magazine).toBe(30); expect(Object.isFrozen(rule.getState())).toBe(true);
});

test('continuous 8/s at 60Hz preserves fractional phase rather than drifting to 7.5/s', () => {
  const rule = new RifleFireState(), ticks: number[] = [];
  for (let i = 0; i < PHYSICS_CONFIG.tickRate; i++) {
    const shot = rule.step(hold); if (shot) ticks.push(shot.tick);
  }
  expect(ticks).toEqual([0, 8, 15, 23, 30, 38, 45, 53]);
  expect(rule.getState().magazine).toBe(22);
  for (let i = 0; i < ticks.length; i++) expect(ticks[i] - i * 60 / 8).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < ticks.length; i++) expect(ticks[i] - i * 60 / 8).toBeLessThan(1);
});

test('empty magazine never underflows or auto-refills from reserve', () => {
  const rule = new RifleFireState(); let shots = 0;
  for (let i = 0; i < 600; i++) if (rule.step(hold)) shots++;
  expect(shots).toBe(30);
  expect(rule.getState()).toEqual({ magazine: 0, reserve: 120, reloading: false, shotsFired: 30 });
  const empty = rule.getState();
  expect(rule.step({ held: false, pressed: true })).toBeNull(); expect(rule.getState()).toBe(empty);
});

test('short press during cooldown is rejected, not buffered for a delayed shot', () => {
  const rule = new RifleFireState();
  expect(rule.step({ held: false, pressed: true })).not.toBeNull();
  expect(rule.step({ held: false, pressed: true })).toBeNull();
  for (let i = 0; i < 100; i++) expect(rule.step(idle)).toBeNull();
  expect(rule.getState().shotsFired).toBe(1);
  expect(rule.step({ held: false, pressed: true })).toMatchObject({ sequence: 2 });
});

test('release/repress and cancellation cannot reset cooldown; idle never catches up missed shots', () => {
  const rule = new RifleFireState(); rule.step(hold);
  expect(rule.step(idle)).toBeNull();
  for (let i = 2; i < 8; i++) expect(rule.step({ held: false, pressed: true })).toBeNull();
  expect(rule.step(hold)).toMatchObject({ tick: 8, sequence: 2 });
  for (let i = 0; i < 300; i++) rule.step(idle);
  const resumed = rule.step(hold); expect(resumed?.sequence).toBe(3);
  for (let i = 0; i < 7; i++) expect(rule.step(hold)).toBeNull();
  expect(rule.step(hold)?.sequence).toBe(4);
});

test('independent instances and custom valid rates do not share ammo or phase', () => {
  const a = new RifleFireState({ ...WEAPON_CONFIGS.rifle, fireRate: 5, magazineSize: 50 });
  const b = new RifleFireState();
  let shots = 0;
  for (let i = 0; i < 60; i++) if (a.step(hold)) shots++;
  expect(shots).toBe(5); expect(a.getState().magazine).toBe(45);
  expect(b.getState().magazine).toBe(30);
});

test('invalid config or intent fails before state and tick mutation', () => {
  for (const config of [{ ...WEAPON_CONFIGS.rifle, fireRate: NaN }, { ...WEAPON_CONFIGS.rifle, fireRate: Number.MIN_VALUE }, { ...WEAPON_CONFIGS.rifle, fireRate: 61 }, WEAPON_CONFIGS.sniper]) {
    expect(() => new RifleFireState(config)).toThrow();
  }
  const rule = new RifleFireState();
  for (const intent of [null, {}, { held: 1, pressed: false }, { held: false, pressed: 'true' }]) {
    expect(() => rule.step(intent as FireIntent)).toThrow(TypeError);
  }
  expect(rule.step(hold)).toMatchObject({ tick: 0, sequence: 1 });
});

test('render grouping does not alter fixed-step ammo or event sequence', () => {
  const a = new RifleFireState(), b = new RifleFireState();
  const eventsA: unknown[] = [], eventsB: unknown[] = [];
  for (let i = 0; i < 180; i++) eventsA.push(a.step(i < 90 ? hold : idle));
  for (let frame = 0; frame < 45; frame++) {
    for (let sub = 0; sub < 4; sub++) eventsB.push(b.step(frame * 4 + sub < 90 ? hold : idle));
  }
  expect(eventsA).toEqual(eventsB); expect(a.getState()).toEqual(b.getState());
});
