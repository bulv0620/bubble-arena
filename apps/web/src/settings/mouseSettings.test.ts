import { expect, test, vi } from 'vitest';
import { MOUSE_SETTINGS, readMouseSpeed, saveMouseSpeed } from './mouseSettings';
import { MouseOrbit } from '../camera/MouseOrbit';
import { KeyboardInput } from '../player/KeyboardInput';
import { ReloadInput } from '../weapons/ReloadInput';

const event = (target: EventTarget, type: string, values = {}) => target.dispatchEvent(Object.assign(new Event(type), values));
test('stored mouse speed validates bounds, empty/corrupt values and blocked storage', () => {
  for (const raw of [null, '', 'bad', 'NaN', 'Infinity', '0', '0.049', '3.1']) {
    expect(readMouseSpeed({ getItem: () => raw, setItem: vi.fn() })).toBe(1);
  }
  const setItem = vi.fn();
  for (const value of [.05, .06, .1, .25, 1, 3]) {
    const storage = { getItem: () => String(value), setItem };
    expect(readMouseSpeed(storage)).toBe(value);
    expect(saveMouseSpeed(storage, value)).toBe(true);
    expect(setItem).toHaveBeenLastCalledWith(MOUSE_SETTINGS.storageKey, String(value));
  }
  const broken = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
  expect(readMouseSpeed(broken)).toBe(1); expect(saveMouseSpeed(broken, 2)).toBe(false);
  expect(saveMouseSpeed({ getItem: () => null, setItem }, NaN)).toBe(false);
});
test('mouse speed applies equally to yaw/pitch and rejects invalid settings', () => {
  const normal = new MouseOrbit(), fast = new MouseOrbit();
  const initial = normal.step().pitch;
  normal.rotate(20, 20); fast.rotate(20, 20, 2);
  expect(fast.step().yaw).toBeCloseTo(normal.step().yaw * 2);
  expect(fast.step().pitch - initial).toBeCloseTo((normal.step().pitch - initial) * 2);
  const previous = fast.step();
  for (const invalid of [NaN, Infinity, 0, 4]) fast.rotate(50, 50, invalid);
  const unchanged = fast.step();
  expect(unchanged.yaw).toBeCloseTo(previous.yaw, 12);
  expect(unchanged.pitch).toBeCloseTo(previous.pitch, 12);
});
test('low mouse speeds keep yaw and pitch proportional down to 0.05', () => {
  for (const speed of [.05, .06, .1]) {
    const normal = new MouseOrbit(), slow = new MouseOrbit();
    const initial = slow.step().pitch;
    normal.rotate(40, 40); slow.rotate(40, 40, speed);
    expect(slow.step().yaw).toBeCloseTo(normal.step().yaw * speed, 12);
    expect(slow.step().pitch - initial).toBeCloseTo((normal.step().pitch - initial) * speed, 12);
  }
});
test('open menu rejects movement, jumping and reload; return requires fresh presses; cleanup releases', () => {
  const global = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as const, hidden: false });
  const input = new KeyboardInput(), reload = new ReloadInput(); let open = false;
  const detach = input.attach(global, doc, () => !open);
  const detachReload = reload.attach(global, doc, () => !open);
  event(global, 'keydown', { code: 'KeyW' });
  expect(input.getSnapshot().forward).toBe(true);
  open = true; input.clear(); reload.clear();
  for (const code of ['KeyW', 'Space', 'KeyR']) event(global, 'keydown', { code });
  expect(input.getSnapshot().forward).toBe(false); expect(input.consumeJump()).toBe(false); expect(reload.consume()).toBe(false);
  open = false;
  expect(input.getSnapshot().forward).toBe(false);
  event(global, 'keydown', { code: 'Space' }); event(global, 'keydown', { code: 'KeyR' });
  expect(input.consumeJump()).toBe(true); expect(reload.consume()).toBe(true);
  detach(); detachReload(); detach(); detachReload();
  event(global, 'keydown', { code: 'KeyW' }); event(global, 'keydown', { code: 'KeyR' });
  expect(input.getSnapshot().forward).toBe(false); expect(reload.consume()).toBe(false);
});
test('fallback dragging reads the latest speed without rebinding and blocks while menu is open', () => {
  const canvas = new EventTarget(), global = new EventTarget(), doc = new EventTarget();
  const orbit = new MouseOrbit(); let speed = 1, open = false;
  const detach = orbit.attach(canvas, global, doc, () => !open, () => speed);
  event(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  event(global, 'mousemove', { buttons: 1, clientX: 10, clientY: 0 });
  expect(orbit.step().yaw).toBeCloseTo(-.03);
  speed = 2;
  event(global, 'mousemove', { buttons: 1, clientX: 20, clientY: 0 });
  expect(orbit.step().yaw).toBeCloseTo(-.09);
  open = true;
  event(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 0 });
  open = false;
  event(global, 'mousemove', { buttons: 1, clientX: 200, clientY: 0 });
  expect(orbit.step().yaw).toBeCloseTo(-.09); detach();
});
