import { expect, test } from 'vitest';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { MOUSE_SETTINGS, SCOPE_MOUSE_SETTINGS, readScopeMouseMultiplier, saveScopeMouseMultiplier } from './mouseSettings';
import { MouseOrbit } from '../camera/MouseOrbit';
import { PointerLockInput } from '../camera/PointerLockInput';
import { AimInput } from '../input/AimInput';
import { LocalLoadout } from '../weapons/LocalLoadout';

const event = (target: EventTarget, type: string, values = {}) => target.dispatchEvent(Object.assign(new Event(type), values));
test('scope preference validates corrupt/blocked storage and preserves the ordinary preference', () => {
  const entries = new Map<string, string>([[MOUSE_SETTINGS.storageKey, '.05']]);
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  for (const raw of ['', 'bad', 'NaN', 'Infinity', '0', '.049', '2.01']) {
    entries.set(SCOPE_MOUSE_SETTINGS.storageKey, raw);
    expect(readScopeMouseMultiplier(storage)).toBe(.3);
  }
  for (const value of [.05, .06, .3, 1, 2]) {
    expect(saveScopeMouseMultiplier(storage, value)).toBe(true);
    expect(readScopeMouseMultiplier(storage)).toBe(value);
  }
  for (const value of [NaN, Infinity, 0, -.1, 2.01]) expect(saveScopeMouseMultiplier(storage, value)).toBe(false);
  expect(readScopeMouseMultiplier(storage)).toBe(2);
  expect(entries.get(MOUSE_SETTINGS.storageKey)).toBe('.05');
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
  expect(readScopeMouseMultiplier(blocked)).toBe(.3);
  expect(saveScopeMouseMultiplier(blocked, .4)).toBe(false);
});
test('scope multiplies both axes, including the minimum product, without adding camera lag', () => {
  for (const [speed, multiplier] of [[.05, .05], [.05, .3], [1, .3], [3, 2]]) {
    const orbit = new MouseOrbit(), start = orbit.step();
    orbit.rotate(10, 10, speed, multiplier);
    const next = orbit.step();
    expect(next.yaw - start.yaw).toBeCloseTo(-10 * CAMERA_CONFIG.mouseSensitivity * speed * multiplier, 12);
    expect(next.pitch - start.pitch).toBeCloseTo(10 * CAMERA_CONFIG.mouseSensitivity * speed * multiplier, 12);
    expect(orbit.step()).toEqual(next);
    for (const invalid of [NaN, Infinity, 0, -.1, 2.01]) orbit.rotate(10, 10, speed, invalid);
    expect(orbit.step()).toEqual(next);
  }
});
test('confirmed lock reads live scope multiplier; shot and weapon change restore ordinary speed, Escape releases', () => {
  const canvas = Object.assign(new EventTarget(), { requestPointerLock: () => {} });
  const global = new EventTarget(), doc = Object.assign(new EventTarget(), { pointerLockElement: null as EventTarget | null });
  const control = new PointerLockInput(), aim = new AimInput(), loadout = new LocalLoadout('sniper'), orbit = new MouseOrbit();
  let multiplier = .3;
  const detachAim = aim.attach(canvas, global, doc, () => true, () => loadout.getSnapshot().active === 'sniper', loadout.canScope);
  const detach = control.attach(canvas, global, doc, (dx, dy) => orbit.rotate(dx, dy, .05, loadout.getSnapshot().scoped ? multiplier : 1), () => aim.clear());
  const move = (factor: number) => {
    const before = orbit.step(); event(global, 'mousemove', { movementX: 20, movementY: 10 });
    expect(orbit.step().yaw - before.yaw).toBeCloseTo(-20 * CAMERA_CONFIG.mouseSensitivity * .05 * factor, 12);
    expect(orbit.step().pitch - before.pitch).toBeCloseTo(10 * CAMERA_CONFIG.mouseSensitivity * .05 * factor, 12);
  };
  try {
    control.request(); doc.pointerLockElement = canvas; event(doc, 'pointerlockchange'); move(1);
    event(canvas, 'mousedown', { button: 2 }); event(global, 'mouseup', { button: 2 });
    loadout.setScoped(aim.getSnapshot()); expect(loadout.getSnapshot().scoped).toBe(true); move(.3);
    multiplier = .05; move(.05);
    expect(loadout.step({ held: true, pressed: true })).not.toBeNull();
    expect(loadout.getSnapshot().scoped).toBe(false); move(1);
    loadout.select(1); expect(loadout.getSnapshot().scoped).toBe(false); move(1);
    const before = orbit.step(); event(global, 'keydown', { code: 'Escape' });
    event(global, 'mousemove', { movementX: 999, movementY: 999 }); expect(orbit.step()).toEqual(before);
  } finally { detach(); detachAim(); }
});
test('fallback dragging reads current scoped speed and clears on menu disable and cleanup', () => {
  const canvas = new EventTarget(), global = new EventTarget(), doc = new EventTarget(), orbit = new MouseOrbit();
  let enabled = true, scoped = false, multiplier = .3;
  const detach = orbit.attach(canvas, global, doc, () => enabled, () => .05, () => scoped ? multiplier : 1);
  event(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  let x = 0, y = 0;
  for (const factor of [1, .3, .05, 1]) {
    scoped = factor !== 1; if (scoped) multiplier = factor;
    const before = orbit.step(); x += 20; y += 10;
    event(global, 'mousemove', { buttons: 1, clientX: x, clientY: y });
    expect(orbit.step().yaw - before.yaw).toBeCloseTo(-20 * CAMERA_CONFIG.mouseSensitivity * .05 * factor, 12);
    expect(orbit.step().pitch - before.pitch).toBeCloseTo(10 * CAMERA_CONFIG.mouseSensitivity * .05 * factor, 12);
  }
  const before = orbit.step(); enabled = false;
  event(global, 'mousemove', { buttons: 1, clientX: 900, clientY: 900 }); enabled = true;
  event(global, 'mousemove', { buttons: 1, clientX: 1000, clientY: 1000 }); expect(orbit.step()).toEqual(before);
  detach(); detach(); event(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  event(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 100 }); expect(orbit.step()).toEqual(before);
});
