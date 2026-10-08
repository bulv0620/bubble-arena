import { beforeEach, expect, test, vi } from 'vitest';
import { KeyboardInput } from './KeyboardInput';

class VisibilityTarget extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
}

let keys: EventTarget;
let visibility: VisibilityTarget;
let input: KeyboardInput;

beforeEach(() => {
  keys = new EventTarget();
  visibility = new VisibilityTarget();
  input = new KeyboardInput();
  input.attach(keys, visibility);
});

function key(type: 'keydown' | 'keyup', code: string, extra = {}, target = keys) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code, key: '任意布局字符', ...extra });
  target.dispatchEvent(event);
  return event;
}

test('physical WASD codes can be held together and released independently', () => {
  expect(key('keydown', 'KeyW').defaultPrevented).toBe(true);
  key('keydown', 'KeyA'); key('keydown', 'KeyS'); key('keydown', 'KeyD');
  expect(input.getSnapshot()).toEqual({ forward: true, left: true, backward: true, right: true });
  key('keyup', 'KeyW');
  expect(input.getSnapshot()).toEqual({ forward: false, left: true, backward: true, right: true });
  input.clear();
  expect(Object.values(input.getSnapshot())).toEqual([false, false, false, false]);
});

test('repeat and unknown keys do not publish redundant state or steal shortcuts', () => {
  const subscriber = vi.fn();
  const unsubscribe = input.subscribe(subscriber);
  const initial = input.getSnapshot();
  expect(key('keydown', 'Space').defaultPrevented).toBe(false);
  key('keydown', 'toString');
  expect(input.getSnapshot()).toBe(initial);
  key('keydown', 'KeyW');
  const held = input.getSnapshot();
  key('keydown', 'KeyW', { repeat: true });
  expect(input.getSnapshot()).toBe(held);
  expect(subscriber).toHaveBeenCalledTimes(1);
  unsubscribe(); key('keyup', 'KeyW');
  expect(subscriber).toHaveBeenCalledTimes(1);
  expect(Object.isFrozen(held)).toBe(true);
});

test.each(['ctrlKey', 'metaKey', 'altKey', 'isComposing'])('%s keydown is ignored, keyup still releases', (modifier) => {
  expect(key('keydown', 'KeyW', { [modifier]: true }).defaultPrevented).toBe(false);
  expect(input.getSnapshot().forward).toBe(false);
  key('keydown', 'KeyW'); key('keyup', 'KeyW', { [modifier]: true });
  expect(input.getSnapshot().forward).toBe(false);
});

test('blur and hidden-tab events clear held keys without keyup; return does not restore them', () => {
  key('keydown', 'KeyW'); key('keydown', 'KeyD'); keys.dispatchEvent(new Event('blur'));
  expect(Object.values(input.getSnapshot()).every((pressed) => !pressed)).toBe(true);
  key('keydown', 'KeyA'); visibility.visibilityState = 'hidden';
  visibility.dispatchEvent(new Event('visibilitychange'));
  key('keydown', 'KeyW');
  expect(Object.values(input.getSnapshot()).every((pressed) => !pressed)).toBe(true);
  visibility.visibilityState = 'visible'; visibility.dispatchEvent(new Event('visibilitychange'));
  expect(input.getSnapshot().forward).toBe(false);
});

test('editable focus clears movement and typing is not captured', () => {
  key('keydown', 'KeyW');
  // EventTarget stubs only the DOM fields used by the adapter.
  Object.assign(visibility, { isContentEditable: true });
  visibility.dispatchEvent(new Event('focusin'));
  expect(input.getSnapshot().forward).toBe(false);
  const editableKeys = Object.assign(new EventTarget(), { closest: () => ({}) });
  const detach = input.attach(editableKeys, visibility);
  expect(key('keydown', 'KeyA', {}, editableKeys).defaultPrevented).toBe(false);
  expect(input.getSnapshot().left).toBe(false);
  detach();
});

test('detach removes listeners, clears state and supports StrictMode reattachment', () => {
  const detach = input.attach(keys, visibility);
  key('keydown', 'KeyW'); detach(); detach();
  key('keydown', 'KeyA');
  expect(Object.values(input.getSnapshot()).every((pressed) => !pressed)).toBe(true);
  const subscriber = vi.fn(); input.subscribe(subscriber);
  const detachAgain = input.attach(keys, visibility);
  detach(); // A stale cleanup must not clear the new attachment.
  key('keydown', 'KeyD');
  expect(subscriber).toHaveBeenCalledTimes(1);
  expect(input.getSnapshot().right).toBe(true);
  keys.dispatchEvent(new Event('blur'));
  expect(input.getSnapshot().right).toBe(false);
  detachAgain();
});
